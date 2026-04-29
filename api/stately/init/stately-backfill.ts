import { keyPath, StatelyError } from '@stately-cloud/client';
import fs from 'node:fs/promises';
import { DatabaseError } from 'pg-protocol';
import { closeDbPool, transaction } from '../../db/index.js';
import { addLoadoutShareIgnoring } from '../../db/loadout-share-queries.js';
import { backfillMigrationState } from '../../db/migration-state-queries.js';
import { getSettings, replaceSettings } from '../../db/settings-queries.js';
import { Loadout } from '../../shapes/loadouts.js';
import { defaultSettings } from '../../shapes/settings.js';
import { delay, subtractObject } from '../../utils.js';
import { client } from '../client.js';
import { Settings } from '../generated/stately_pb.js';
import { convertLoadoutFromStately } from '../loadouts-queries.js';
import { convertToDimSettings, keyFor as settingsKey } from '../settings-queries.js';

function keyForLoadoutShare(shareId: string) {
  return keyPath`/loadoutShare-${shareId}`;
}

async function replaceSettingsIfNotPresent(
  pgClient: Parameters<typeof getSettings>[0],
  bungieMembershipId: number,
  settings: Partial<import('../../shapes/settings.js').Settings>,
) {
  const existing = await getSettings(pgClient, bungieMembershipId);
  if (!existing || existing.deleted) {
    await replaceSettings(pgClient, bungieMembershipId, settings);
  }
}

const configuredTokenPath = process.env.BACKFILL_TOKEN_PATH ?? 'backfill-token.bin';
const profileBatchSize = parseNumberEnv('BACKFILL_PROFILE_BATCH_SIZE', 1000);
const settingsBatchSize = parseNumberEnv('BACKFILL_SETTINGS_BATCH_SIZE', 50);
const shareBatchSize = parseNumberEnv('BACKFILL_SHARE_BATCH_SIZE', 50);
const continuationDelayMs = parseNumberEnv('BACKFILL_CONTINUATION_DELAY_MS', 1000);
const retryMaxAttempts = parseNumberEnv('BACKFILL_RETRY_MAX_ATTEMPTS', 12);
const retryBaseDelayMs = parseNumberEnv('BACKFILL_RETRY_BASE_DELAY_MS', 1000);
const retryMaxDelayMs = parseNumberEnv('BACKFILL_RETRY_MAX_DELAY_MS', 30000);
const statelyThrottleMinDelayMs = parseNumberEnv('BACKFILL_STATELY_THROTTLE_DELAY_MS', 15000);
const retryThrottlingForever =
  (process.env.BACKFILL_RETRY_THROTTLING_FOREVER ?? 'true') !== 'false';
const configuredParallelSegments = parseNumberEnv('BACKFILL_PARALLEL_SEGMENTS', 1);
const configuredTotalSegments = process.env.BACKFILL_TOTAL_SEGMENTS
  ? parseNumberEnv('BACKFILL_TOTAL_SEGMENTS', 1)
  : undefined;
const configuredSegmentIndex = parseNonNegativeIntEnv('BACKFILL_SEGMENT_INDEX');

interface RetryableError {
  code?: string;
  statelyCode?: string;
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

function isStatelyThroughputError(error: unknown): boolean {
  if (error instanceof StatelyError) {
    return (
      error.statelyCode === 'StoreThroughputExceeded' ||
      error.statelyCode === 'StoreRequestLimitExceeded'
    );
  }

  if (!error || typeof error !== 'object') {
    return false;
  }

  const retryable = error as RetryableError;
  if (
    retryable.statelyCode === 'StoreThroughputExceeded' ||
    retryable.statelyCode === 'StoreRequestLimitExceeded'
  ) {
    return true;
  }

  if (retryable.cause) {
    return isStatelyThroughputError(retryable.cause);
  }

  return false;
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

function parseNonNegativeIntEnv(envName: string): number | undefined {
  const raw = process.env[envName];
  if (raw === undefined || raw === '') {
    return undefined;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${envName} must be a non-negative integer`);
  }

  return parsed;
}

function tokenPathForSegment(
  basePath: string,
  segmentIndex: number,
  totalSegments: number,
): string {
  if (totalSegments <= 1) {
    return basePath;
  }

  const marker = `.segment-${segmentIndex + 1}-of-${totalSegments}`;
  const dotIndex = basePath.lastIndexOf('.');
  if (dotIndex <= 0) {
    return `${basePath}${marker}`;
  }

  return `${basePath.slice(0, dotIndex)}${marker}${basePath.slice(dotIndex)}`;
}

function getNestedStatus(error: RetryableError): number | undefined {
  return error.status ?? error.statusCode ?? error.response?.status;
}

function getHeaders(
  error: RetryableError,
): Record<string, string | number | undefined> | undefined {
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
  if (error instanceof StatelyError) {
    return [
      'StoreThroughputExceeded',
      'StoreRequestLimitExceeded',
      'StoreInUse',
      'ConcurrentModification',
      'CachedSchemaTooOld',
      'BackupsUnavailable',
    ].includes(error.statelyCode);
  }

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
  const retryDelay = exponential + jitter;

  if (isStatelyThroughputError(error)) {
    // Give Stately autoscaling enough time to react to hot partitions and traffic bursts.
    return Math.min(retryMaxDelayMs, Math.max(statelyThrottleMinDelayMs, retryDelay));
  }

  return Math.min(retryMaxDelayMs, retryDelay);
}

async function withRetry<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      const retryable = isRetryableError(error);
      const throttleRetry = retryThrottlingForever && isStatelyThroughputError(error);
      if (!retryable || (!throttleRetry && attempt >= retryMaxAttempts)) {
        throw error;
      }

      const waitMs = retryDelayMs(error, attempt);
      const message = error instanceof Error ? error.message : String(error);
      const attemptLabel = throttleRetry
        ? `${attempt}/unbounded`
        : `${attempt}/${retryMaxAttempts}`;
      console.log(
        `${name} failed with retryable error (attempt ${attemptLabel}). Waiting ${waitMs}ms before retry.`,
        message,
      );
      await delay(waitMs);
    }
  }
}

type ScanList = ReturnType<typeof client.beginScan>;
const scanItemTypes: NonNullable<Parameters<typeof client.beginScan>[0]>['itemTypes'] = [
  'LoadoutShare',
  'ItemAnnotation',
  'ItemHashTag',
  'Loadout',
  'Search',
  'Triumph',
  'Settings',
];

async function runSegment(segmentIndex: number, totalSegments: number, workerCount: number) {
  const tokenPath = tokenPathForSegment(configuredTokenPath, segmentIndex, totalSegments);
  const logPrefix = `[segment ${segmentIndex + 1}/${totalSegments}]`;
  const tokenData = await fs.readFile(tokenPath).catch(() => null);

  console.log(logPrefix, 'Starting scan using token file', tokenPath);

  let list: ScanList = tokenData
    ? await withRetry<ScanList>(`${logPrefix} Continue scan from token file`, () =>
        client.continueScan(tokenData),
      )
    : await withRetry(`${logPrefix} Begin scan`, () =>
        client.beginScan({
          itemTypes: scanItemTypes,
          totalSegments,
          segmentIndex,
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

    console.log(logPrefix, 'Backfilling migration states for', profileIds.size, 'profiles...');
    const items = [...profileIds];
    await withRetry(`${logPrefix} Backfill migration states`, async () => {
      await transaction(async (pgClient) => {
        for (const profileId of items) {
          await backfillMigrationState(pgClient, profileId.toString(), undefined);
        }
      });
    });
    profileIds.clear();
    console.log(logPrefix, 'Done');
  }

  async function flushSettingsQueue(force = false) {
    if (!force && settingsQueue.length < settingsBatchSize) {
      return;
    }
    if (settingsQueue.length === 0) {
      return;
    }

    console.log(logPrefix, 'Backfilling settings for', settingsQueue.length, 'users...');
    const batch = [...settingsQueue];
    await withRetry(`${logPrefix} Backfill settings`, async () => {
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

    await withRetry(`${logPrefix} Delete migrated settings from Stately`, async () => {
      await client.del(...batch.map((s) => settingsKey(Number(s.memberId))));
    });

    settingsQueue.splice(0, batch.length);
    console.log(logPrefix, 'Done');
  }

  async function flushShareQueue(force = false) {
    if (!force && shareQueue.length < shareBatchSize) {
      return;
    }
    if (shareQueue.length === 0) {
      return;
    }

    console.log(logPrefix, 'Backfilling', shareQueue.length, 'loadout shares...');
    const batch = [...shareQueue];

    await withRetry(`${logPrefix} Backfill loadout shares`, async () => {
      await transaction(async (pgClient) => {
        for (const share of batch) {
          const inserted = await addLoadoutShareIgnoring(
            pgClient,
            undefined,
            share.platformMembershipId,
            share.shareId,
            share.loadout,
            share.viewCount,
          );
          if (!inserted) {
            console.log(logPrefix, 'Loadout share collision ignoring', share.shareId);
          }
        }
      });
    });

    await withRetry(`${logPrefix} Delete migrated loadout shares from Stately`, async () => {
      await client.del(...batch.map((s) => keyForLoadoutShare(s.shareId)));
    });

    shareQueue.splice(0, batch.length);
    console.log(logPrefix, 'Done');
  }

  let scanComplete = false;

  while (true) {
    try {
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
    } catch (error) {
      if (!isRetryableError(error)) {
        throw error;
      }

      const waitMs = retryDelayMs(error, 1);
      const message = error instanceof Error ? error.message : String(error);
      const token = list.token;
      if (token) {
        await fs.writeFile(tokenPath, token.tokenData);
        console.log(
          `${logPrefix} Scan iteration failed with retryable error. Waiting ${waitMs}ms before continuing scan.`,
          message,
        );
        await delay(waitMs);

        list = await withRetry(`${logPrefix} Continue scan after retryable scan failure`, () =>
          client.continueScan(token),
        );
        continue;
      }

      const persistedTokenData = await fs.readFile(tokenPath).catch(() => null);
      if (persistedTokenData) {
        console.log(
          `${logPrefix} Retryable scan failure without in-memory token. Waiting ${waitMs}ms before resuming from persisted token.`,
          message,
        );
        await delay(waitMs);
        list = await withRetry(
          `${logPrefix} Continue scan from persisted token after retryable scan failure`,
          () => client.continueScan(persistedTokenData),
        );
        continue;
      }

      console.log(
        `${logPrefix} Retryable scan failure without token. Waiting ${waitMs}ms before restarting segment scan.`,
        message,
      );
      await delay(waitMs);
      list = await withRetry(`${logPrefix} Restart segment scan after retryable scan failure`, () =>
        client.beginScan({
          itemTypes: scanItemTypes,
          totalSegments,
          segmentIndex,
        }),
      );
      continue;
    }

    const token = list.token;
    if (!token) {
      console.log(logPrefix, 'Scan token missing, ending scan loop.');
      break;
    }

    await fs.writeFile(tokenPath, token.tokenData);
    if (!token.canContinue) {
      console.log(logPrefix, 'Scan complete.');
      scanComplete = true;
      break;
    }

    await delay(continuationDelayMs);
    console.log(logPrefix, 'Continuing scan...');
    list = await withRetry(`${logPrefix} Continue scan`, () => client.continueScan(token));
  }

  await flushProfileIds(true);
  await flushSettingsQueue(true);
  await flushShareQueue(true);

  if (scanComplete) {
    await fs.unlink(tokenPath).catch(() => undefined);
  }

  if (workerCount > 1) {
    console.log(logPrefix, 'Worker complete.');
  }
}

try {
  const totalSegments = configuredTotalSegments ?? configuredParallelSegments;

  if (configuredSegmentIndex !== undefined) {
    if (configuredTotalSegments === undefined) {
      throw new Error('BACKFILL_TOTAL_SEGMENTS must be set when BACKFILL_SEGMENT_INDEX is set');
    }
    if (configuredSegmentIndex >= configuredTotalSegments) {
      throw new Error('BACKFILL_SEGMENT_INDEX must be less than BACKFILL_TOTAL_SEGMENTS');
    }
    await runSegment(configuredSegmentIndex, configuredTotalSegments, 1);
  } else if (totalSegments <= 1) {
    await runSegment(0, 1, 1);
  } else {
    const workers = Array.from({ length: totalSegments }, (_, segmentIndex) =>
      runSegment(segmentIndex, totalSegments, totalSegments),
    );
    await Promise.all(workers);
  }
} finally {
  await closeDbPool();
}
