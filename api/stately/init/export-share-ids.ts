import fs from 'node:fs/promises';
import { DatabaseError } from 'pg-protocol';
import { closeDbPool, transaction } from '../../db/index.js';
import { addLoadoutShareIgnoring } from '../../db/loadout-share-queries.js';
import { backfillMigrationState } from '../../db/migration-state-queries.js';
import { replaceSettingsIfNotPresent } from '../../db/settings-queries.js';
import { Loadout } from '../../shapes/loadouts.js';
import { defaultSettings } from '../../shapes/settings.js';
import { delay, subtractObject } from '../../utils.js';
import { client } from '../client.js';
import { Settings } from '../generated/stately_pb.js';
import { keyFor as keyForLoadoutShare } from '../loadout-share-queries.js';
import { convertLoadoutFromStately } from '../loadouts-queries.js';
import { convertToDimSettings, keyFor as settingsKey } from '../settings-queries.js';

const tokenPath = process.env.BACKFILL_TOKEN_PATH ?? 'backfill-token.bin';
const profileBatchSize = parseNumberEnv('BACKFILL_PROFILE_BATCH_SIZE', 1000);
const settingsBatchSize = parseNumberEnv('BACKFILL_SETTINGS_BATCH_SIZE', 50);
const shareBatchSize = parseNumberEnv('BACKFILL_SHARE_BATCH_SIZE', 50);
const continuationDelayMs = parseNumberEnv('BACKFILL_CONTINUATION_DELAY_MS', 1000);
const retryMaxAttempts = parseNumberEnv('BACKFILL_RETRY_MAX_ATTEMPTS', 12);
const retryBaseDelayMs = parseNumberEnv('BACKFILL_RETRY_BASE_DELAY_MS', 1000);
const retryMaxDelayMs = parseNumberEnv('BACKFILL_RETRY_MAX_DELAY_MS', 30000);

interface RetryableError {
  code?: string;
  status?: number;
  statusCode?: number;
  headers?: Record<string, string | number | undefined>;
  response?: {
    status?: number;
    headers?: Record<string, string | number | undefined>;
  };
  cause?: unknown;
  message?: string;
}

function parseNumberEnv(envName: string, defaultValue: number) {
  const raw = process.env[envName];
  if (!raw) {
    return defaultValue;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${envName} must be a positive number`);
  }
  return parsed;
}

function getNestedStatus(error: RetryableError): number | undefined {
  return error.status ?? error.statusCode ?? error.response?.status;
}

function getHeaders(error: RetryableError): Record<string, string | number | undefined> | undefined {
  return error.headers ?? error.response?.headers;
}

function getRetryAfterMs(error: RetryableError): number | undefined {
  const headers = getHeaders(error);
  const retryAfter = headers?.['retry-after'] ?? headers?.['Retry-After'];
  if (retryAfter === undefined) {
    return undefined;
  }

  const retryAfterSeconds = Number(retryAfter);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  if (typeof retryAfter === 'string') {
    const retryAt = Date.parse(retryAfter);
    if (!Number.isNaN(retryAt)) {
      return Math.max(0, retryAt - Date.now());
    }
  }

  return undefined;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof DatabaseError) {
    return error.code ? ['40001', '40P01', '53300', '57P03'].includes(error.code) : false;
  }

  if (!error || typeof error !== 'object') {
    return false;
  }

  const retryable = error as RetryableError;
  const status = getNestedStatus(retryable);

  if (status === 429 || (status !== undefined && status >= 500)) {
    return true;
  }

  if (
    retryable.code &&
    ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND'].includes(retryable.code)
  ) {
    return true;
  }

  if (typeof retryable.message === 'string') {
    const msg = retryable.message.toLowerCase();
    return (
      msg.includes('throttl') ||
      msg.includes('too many requests') ||
      msg.includes('rate limit') ||
      msg.includes('temporar') ||
      msg.includes('timeout')
    );
  }

  if (retryable.cause) {
    return isRetryableError(retryable.cause);
  }

  return false;
}

function retryDelayMs(error: unknown, attempt: number) {
  const forcedDelay =
    error && typeof error === 'object' ? getRetryAfterMs(error as RetryableError) : undefined;
  if (forcedDelay !== undefined) {
    return Math.min(retryMaxDelayMs, Math.max(retryBaseDelayMs, forcedDelay));
  }

  const exponential = retryBaseDelayMs * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * retryBaseDelayMs);
  return Math.min(retryMaxDelayMs, exponential + jitter);
}

async function withRetry<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableError(error) || attempt >= retryMaxAttempts) {
        throw error;
      }

      const waitMs = retryDelayMs(error, attempt);
      const message = error instanceof Error ? error.message : String(error);
      console.log(
        `${name} failed with retryable error (attempt ${attempt}/${retryMaxAttempts}). Waiting ${waitMs}ms before retry.`,
        message,
      );
      await delay(waitMs);
    }
  }
}

const tokenData = await fs.readFile(tokenPath).catch(() => null);

type ScanList = ReturnType<typeof client.beginScan>;

let list: ScanList = tokenData
  ? await withRetry<ScanList>('Continue scan from token file', () => client.continueScan(tokenData))
  : await withRetry('Begin scan', () =>
      client.beginScan({
        itemTypes: [
          'LoadoutShare',
          'ItemAnnotation',
          'ItemHashTag',
          'Loadout',
          'Search',
          'Triumph',
          'Settings',
        ],
      }),
    );

const profileIds = new Set<bigint>();

const settingsQueue: Settings[] = [];
const shareQueue: {
  loadout: Loadout;
  viewCount: number;
  platformMembershipId: string;
  shareId: string;
}[] = [];

async function flushProfileIds(force = false) {
  if (!force && profileIds.size < profileBatchSize) {
    return;
  }
  if (profileIds.size === 0) {
    return;
  }

  console.log('Backfilling migration states for', profileIds.size, 'profiles...');
  const items = [...profileIds];
  await withRetry('Backfill migration states', async () => {
    await transaction(async (pgClient) => {
      for (const profileId of items) {
        await backfillMigrationState(pgClient, profileId.toString(), undefined);
      }
    });
  });
  profileIds.clear();
  console.log('Done');
}

async function flushSettingsQueue(force = false) {
  if (!force && settingsQueue.length < settingsBatchSize) {
    return;
  }
  if (settingsQueue.length === 0) {
    return;
  }

  console.log('Backfilling settings for', settingsQueue.length, 'users...');
  const batch = [...settingsQueue];
  await withRetry('Backfill settings', async () => {
    await transaction(async (pgClient) => {
      for (const settings of batch) {
        await replaceSettingsIfNotPresent(
          pgClient,
          Number(settings.memberId),
          subtractObject(convertToDimSettings(settings), defaultSettings),
        );
      }
    });
  });

  await withRetry('Delete migrated settings from Stately', async () => {
    await client.del(...batch.map((s) => settingsKey(Number(s.memberId))));
  });

  settingsQueue.splice(0, batch.length);
  console.log('Done');
}

async function flushShareQueue(force = false) {
  if (!force && shareQueue.length < shareBatchSize) {
    return;
  }
  if (shareQueue.length === 0) {
    return;
  }

  console.log('Backfilling', shareQueue.length, 'loadout shares...');
  const batch = [...shareQueue];

  await withRetry('Backfill loadout shares', async () => {
    await transaction(async (pgClient) => {
      for (const share of batch) {
        try {
          await addLoadoutShareIgnoring(
            pgClient,
            undefined,
            share.platformMembershipId,
            share.shareId,
            share.loadout,
          );
        } catch (error) {
          if (error instanceof DatabaseError && error.code === '23505') {
            // unique violation, delete the stately one
            console.log('Loadout share collision ignoring', share.shareId);
          } else {
            throw error;
          }
        }
      }
    });
  });

  await withRetry('Delete migrated loadout shares from Stately', async () => {
    await client.del(...batch.map((s) => keyForLoadoutShare(s.shareId)));
  });

  shareQueue.splice(0, batch.length);
  console.log('Done');
}

let scanComplete = false;

try {
  while (true) {
    for await (const item of list) {
      if (client.isType(item, 'LoadoutShare')) {
        shareQueue.push({
          loadout: convertLoadoutFromStately(item),
          viewCount: item.viewCount,
          platformMembershipId: item.profileId.toString(),
          shareId: item.id,
        });
      } else if (client.isType(item, 'Settings')) {
        settingsQueue.push(item);
      } else if ('profileId' in item) {
        profileIds.add(item.profileId);
      }

      await flushProfileIds();
      await flushSettingsQueue();
      await flushShareQueue();
    }

    const token = list.token;
    if (!token) {
      console.log('Scan token missing, ending scan loop.');
      break;
    }

    await fs.writeFile(tokenPath, token.tokenData);
    if (!token.canContinue) {
      console.log('Scan complete.');
      scanComplete = true;
      break;
    }

    await delay(continuationDelayMs);
    console.log('Continuing scan...');
    list = await withRetry('Continue scan', () => client.continueScan(token));
  }

  await flushProfileIds(true);
  await flushSettingsQueue(true);
  await flushShareQueue(true);

  if (scanComplete) {
    await fs.unlink(tokenPath).catch(() => undefined);
  }
} finally {
  await closeDbPool();
}
