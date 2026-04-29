import { ClientBase } from 'pg';
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
const betweenUsersDelayMs = parseNumberEnv('MIGRATION_WORKER_BETWEEN_USERS_DELAY_MS', 100);
const runOnce = (process.env.MIGRATION_WORKER_RUN_ONCE ?? 'false') === 'true';

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
  const exportResponse = await exportDataForProfile(platformMembershipId);
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
    const claimed = await transaction((client) => claimMigrationWork(client, workerBatchSize));

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
        await transaction(async (pgClient) => {
          await migrateOneClaimedUser(pgClient, bungieMembershipId, platformMembershipId);
        });

        await transaction(async (pgClient) => {
          await finishMigrationToPostgres(pgClient, bungieMembershipId, platformMembershipId);
        });

        console.log(`Migration finished for ${platformMembershipId}`);
      } catch (error) {
        const errorMessage = toErrorMessage(error);
        console.error(`Migration failed for ${platformMembershipId}:`, errorMessage);
        await transaction(async (pgClient) => {
          await abortMigrationToPostgres(
            pgClient,
            bungieMembershipId,
            platformMembershipId,
            errorMessage,
          );
        });
      }

      await delay(betweenUsersDelayMs);
    }

    if (runOnce) {
      break;
    }
  }
} finally {
  await closeDbPool();
}
