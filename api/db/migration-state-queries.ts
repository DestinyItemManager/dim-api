import { ClientBase } from 'pg';
import { metrics } from '../metrics/index.js';
import { transaction } from './index.js';

export const MAX_MIGRATION_ATTEMPTS = 3;

export const enum MigrationState {
  Invalid = 0,
  Stately = 1,
  MigratingToPostgres = 2,
  Postgres = 3,
}

export interface MigrationStateInfo {
  platformMembershipId: string;
  bungieMembershipId: number;
  state: MigrationState;
  lastStateChangeAt: number;
  attemptCount: number;
  lastError?: string;
}

interface MigrationStateRow {
  membership_id: number;
  platform_membership_id: string;
  state: number;
  last_state_change_at: Date;
  attempt_count: number;
  last_error: string | null;
}

export async function getUsersToMigrate(client: ClientBase): Promise<number[]> {
  const results = await client.query<MigrationStateRow>({
    name: 'get_users_to_migrate',
    text: 'select membership_id from migration_state where state != 3 limit 1000',
  });
  return results.rows.map((row) => row.membership_id);
}

export async function getMigrationState(
  client: ClientBase,
  platformMembershipId: string,
): Promise<MigrationStateInfo> {
  const results = await client.query<MigrationStateRow>({
    name: 'get_migration_state',
    text: 'SELECT membership_id, platform_membership_id, state, last_state_change_at, attempt_count, last_error FROM migration_state WHERE platform_membership_id = $1',
    values: [platformMembershipId],
  });
  if (results.rows.length > 0) {
    return convert(results.rows[0]);
  } else {
    return {
      bungieMembershipId: 0,
      platformMembershipId,
      state: MigrationState.Stately,
      lastStateChangeAt: 0,
      attemptCount: 0,
    };
  }
}

function convert(row: MigrationStateRow): MigrationStateInfo {
  return {
    bungieMembershipId: row.membership_id,
    platformMembershipId: row.platform_membership_id,
    state: row.state,
    lastStateChangeAt: row.last_state_change_at.getTime(),
    attemptCount: row.attempt_count,
    lastError: row.last_error ?? undefined,
  };
}

export function startMigrationToPostgres(
  client: ClientBase,
  bungieMembershipId: number,
  platformMembershipId: string,
): Promise<void> {
  return updateMigrationState(
    client,
    bungieMembershipId,
    platformMembershipId,
    MigrationState.MigratingToPostgres,
    MigrationState.Stately,
    true,
  );
}

export function finishMigrationToPostgres(
  client: ClientBase,
  bungieMembershipId: number,
  platformMembershipId: string,
): Promise<void> {
  return updateMigrationState(
    client,
    bungieMembershipId,
    platformMembershipId,
    MigrationState.Postgres,
    MigrationState.MigratingToPostgres,
    false,
  );
}

export function abortMigrationToPostgres(
  client: ClientBase,
  bungieMembershipId: number,
  platformMembershipId: string,
  err: string,
): Promise<void> {
  return updateMigrationState(
    client,
    bungieMembershipId,
    platformMembershipId,
    MigrationState.Stately,
    MigrationState.MigratingToPostgres,
    false,
    err,
  );
}

async function updateMigrationState(
  client: ClientBase,
  bungieMembershipId: number,
  platformMembershipId: string,
  state: MigrationState,
  expectedState: MigrationState,
  incrementAttempt = true,
  err?: string,
): Promise<void> {
  // Postgres upserts are awkward but nice to have
  const response = await client.query({
    name: 'update_migration_state',
    text: `insert into migration_state (platform_membership_id, membership_id, state, last_state_change_at, attempt_count, last_error) VALUES ($1, $2, $3, current_timestamp, $4, $5)
on conflict (platform_membership_id)
do update set state = $2, last_state_change_at = current_timestamp, attempt_count = migration_state.attempt_count + $3, last_error = coalesce($4, migration_state.last_error)
where migration_state.state = $5`,
    values: [
      platformMembershipId,
      bungieMembershipId,
      state,
      incrementAttempt ? 1 : 0,
      err ?? null,
      expectedState,
    ],
  });
  if (response.rowCount === 0) {
    throw new Error('Migration state was not in expected state');
  }
}

// Mostly for tests and delete-my-data
export async function deleteMigrationState(
  client: ClientBase,
  platformMembershipId: string,
): Promise<void> {
  await client.query({
    name: 'delete_migration_state',
    text: 'DELETE FROM migration_state WHERE platform_membership_id = $1',
    values: [platformMembershipId],
  });
}

// const forcePostgresMembershipIds = new Set([
//   // Ben
//   7094,
//   // Test user
//   1234,
// ]);

// const dialPercentage = 1.0; // 0 - 1.0

// This would be better as a uniform hash but this is good enough for now
// function isUserDialedIn(bungieMembershipId: number) {
//   return (bungieMembershipId % 10000) / 10000 < dialPercentage;
// }

export async function getDesiredMigrationState(_migrationState: MigrationStateInfo) {
  return MigrationState.Stately;

  // TODO: we'll handle this later

  // // TODO: use a uniform hash and a percentage dial to control this
  // const desiredState =
  //   forceStatelyMembershipIds.has(migrationState.bungieMembershipId) ||
  //   isUserDialedIn(migrationState.bungieMembershipId)
  //     ? MigrationState.Stately
  //     : MigrationState.Postgres;

  // if (desiredState === migrationState.state) {
  //   return migrationState.state;
  // }

  // if (
  //   desiredState === MigrationState.Stately &&
  //   migrationState.state === MigrationState.Postgres &&
  //   migrationState.attemptCount >= MAX_MIGRATION_ATTEMPTS
  // ) {
  //   return MigrationState.Postgres;
  // }

  // if (
  //   migrationState.state === MigrationState.MigratingToStately &&
  //   // If we've been in this state for more than 15 minutes, just move on
  //   migrationState.lastStateChangeAt < Date.now() - 1000 * 60 * 15
  // ) {
  //   await transaction(async (client) => {
  //     abortMigrationToStately(client, migrationState.bungieMembershipId, 'Migration timed out');
  //   });
  //   return MigrationState.Postgres;
  // }

  // if (migrationState.state === MigrationState.MigratingToStately) {
  //   throw new Error('Unable to update - please wait a bit and try again.');
  // }

  // return desiredState;
}

/**
 * Wrap the migration process - start a migration, run fn(), finish the
 * migration. Abort on failure.
 */
export async function doMigration(
  bungieMembershipId: number,
  platformMembershipId: string,
  fn: () => Promise<void>,
  onBeforeFinish?: (client: ClientBase) => Promise<any>,
): Promise<void> {
  try {
    metrics.increment('migration.start.count');
    await transaction(async (client) => {
      await startMigrationToPostgres(client, bungieMembershipId, platformMembershipId);
    });
    await fn();
    await transaction(async (client) => {
      await onBeforeFinish?.(client);
      await finishMigrationToPostgres(client, bungieMembershipId, platformMembershipId);
    });
    metrics.increment('migration.finish.count');
  } catch (e) {
    console.error(
      `Stately migration failed for ${platformMembershipId} (${bungieMembershipId})`,
      e,
    );
    await transaction(async (client) => {
      await abortMigrationToPostgres(
        client,
        bungieMembershipId,
        platformMembershipId,
        e instanceof Error ? e.message : 'Unknown error',
      );
    });
    metrics.increment('migration.abort.count');
    throw e;
  }
}
