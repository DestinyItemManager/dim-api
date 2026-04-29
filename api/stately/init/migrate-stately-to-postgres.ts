import { StatelyError } from '@stately-cloud/client';
import { ClientBase } from 'pg';
import { DatabaseError } from 'pg-protocol';
import { closeDbPool, transaction } from '../../db/index.js';
import { updateItemAnnotation } from '../../db/item-annotations-queries.js';
import { updateItemHashTag } from '../../db/item-hash-tags-queries.js';
import { updateLoadout } from '../../db/loadouts-queries.js';
import {
  abortMigrationToPostgres,
  claimMigrationWork,
  finishMigrationToPostgres,
} from '../../db/migration-state-queries.js';
import { importSearch } from '../../db/searches-queries.js';
import { trackTriumph } from '../../db/triumphs-queries.js';
import { extractImportData } from '../../routes/import.js';
import { delay } from '../../utils.js';
import { exportDataForProfile } from '../bulk-queries.js';

const workerBatchSize = parseNumberEnv('MIGRATION_WORKER_BATCH_SIZE', 25);
const idleDelayMs = parseNumberEnv('MIGRATION_WORKER_IDLE_DELAY_MS', 5000);
const retryMaxAttempts = parseNumberEnv('MIGRATION_RETRY_MAX_ATTEMPTS', 12);
const retryBaseDelayMs = parseNumberEnv('MIGRATION_RETRY_BASE_DELAY_MS', 1000);
const retryMaxDelayMs = parseNumberEnv('MIGRATION_RETRY_MAX_DELAY_MS', 30000);
const statelyThrottleMinDelayMs = parseNumberEnv('MIGRATION_STATELY_THROTTLE_DELAY_MS', 15000);
const retryThrottlingForever =
  (process.env.MIGRATION_RETRY_THROTTLING_FOREVER ?? 'true') !== 'false';
const runOnce = (process.env.MIGRATION_WORKER_RUN_ONCE ?? 'false') === 'true';

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

  return retryable.cause ? isStatelyThroughputError(retryable.cause) : false;
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
    if (
      msg.includes('throttl') ||
      msg.includes('too many requests') ||
      msg.includes('rate limit') ||
      msg.includes('temporar') ||
      msg.includes('timeout')
    ) {
      return true;
    }
  }

  return retryable.cause ? isRetryableError(retryable.cause) : false;
}

function retryDelayMs(error: unknown, attempt: number): number {
  const forcedDelay =
    error && typeof error === 'object' ? getRetryAfterMs(error as RetryableError) : undefined;
  if (forcedDelay !== undefined) {
    return Math.min(retryMaxDelayMs, Math.max(retryBaseDelayMs, forcedDelay));
  }

  const exponential = retryBaseDelayMs * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * retryBaseDelayMs);
  const retryDelay = exponential + jitter;

  if (isStatelyThroughputError(error)) {
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

function parseNumberEnv(envName: string, defaultValue: number): number {
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

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }
  return String(error).slice(0, 500);
}

async function migrateOneClaimedUser(
  pgClient: ClientBase,
  bungieMembershipId: number | undefined,
  platformMembershipId: string,
): Promise<void> {
  const exportResponse = await withRetry(`exportDataForProfile:${platformMembershipId}`, () =>
    exportDataForProfile(platformMembershipId),
  );
  const { loadouts, itemAnnotations, triumphs, searches, itemHashTags } =
    extractImportData(exportResponse);

  for (const loadoutData of loadouts) {
    await updateLoadout(
      pgClient,
      bungieMembershipId,
      loadoutData.platformMembershipId,
      loadoutData.destinyVersion,
      loadoutData,
    );
  }

  for (const tagData of itemAnnotations) {
    await updateItemAnnotation(
      pgClient,
      bungieMembershipId,
      tagData.platformMembershipId,
      tagData.destinyVersion,
      tagData,
    );
  }

  for (const hashTag of itemHashTags) {
    await updateItemHashTag(pgClient, bungieMembershipId, platformMembershipId, hashTag);
  }

  for (const triumphSet of triumphs) {
    for (const recordHash of triumphSet.triumphs) {
      await trackTriumph(pgClient, bungieMembershipId, triumphSet.platformMembershipId, recordHash);
    }
  }

  for (const searchData of searches) {
    await importSearch(
      pgClient,
      bungieMembershipId,
      platformMembershipId,
      searchData.destinyVersion,
      searchData.search.query,
      searchData.search.saved,
      searchData.search.lastUsage,
      searchData.search.usageCount,
      searchData.search.type,
    );
  }
}

let loopsWithoutWork = 0;

try {
  while (true) {
    const claimed = await withRetry('claimMigrationWork', () =>
      transaction((client) => claimMigrationWork(client, workerBatchSize)),
    );

    if (claimed.length === 0) {
      loopsWithoutWork += 1;
      if (loopsWithoutWork % 12 === 1) {
        console.log('No migration work available, waiting...');
      }
      if (runOnce) {
        break;
      }
      await delay(idleDelayMs);
      continue;
    }

    loopsWithoutWork = 0;
    console.log(`Claimed ${claimed.length} migration record(s)`);

    for (const workItem of claimed) {
      const { platformMembershipId, bungieMembershipId, attemptCount } = workItem;
      console.log(
        `Migrating ${platformMembershipId} (bungie=${String(bungieMembershipId)}, attempt=${attemptCount})`,
      );

      try {
        await withRetry(`migrateOne:${platformMembershipId}`, () =>
          transaction(async (pgClient) => {
            await migrateOneClaimedUser(pgClient, bungieMembershipId, platformMembershipId);
          }),
        );

        await withRetry(`finishMigration:${platformMembershipId}`, () =>
          transaction(async (pgClient) => {
            await finishMigrationToPostgres(pgClient, bungieMembershipId, platformMembershipId);
          }),
        );

        console.log(`Migration finished for ${platformMembershipId}`);
      } catch (error) {
        const errorMessage = toErrorMessage(error);
        console.error(`Migration failed for ${platformMembershipId}:`, errorMessage);
        await withRetry(`abortMigration:${platformMembershipId}`, () =>
          transaction(async (pgClient) => {
            await abortMigrationToPostgres(
              pgClient,
              bungieMembershipId,
              platformMembershipId,
              errorMessage,
            );
          }),
        );
      }
    }

    if (runOnce) {
      break;
    }
  }
} finally {
  await closeDbPool();
}
