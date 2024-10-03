import { ClientBase } from 'pg';
import { metrics } from '../metrics/index.js';
import { transaction } from './index.js';

export const MAX_MIGRATION_ATTEMPTS = 3;

export const enum MigrationState {
  Invalid = 0,
  Postgres = 1,
  MigratingToStately = 2,
  Stately = 3,
}

export interface MigrationStateInfo {
  bungieMembershipId: number;
  state: MigrationState;
  lastStateChangeAt: number;
  attemptCount: number;
  lastError?: string;
}

interface MigrationStateRow {
  membership_id: number;
  state: number;
  last_state_change_at: Date;
  attempt_count: number;
  last_error: string | null;
}

export async function getMigrationState(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<MigrationStateInfo> {
  const results = await client.query<MigrationStateRow>({
    name: 'get_migration_state',
    text: 'SELECT membership_id, state, last_state_change_at, attempt_count, last_error FROM migration_state WHERE membership_id = $1',
    values: [bungieMembershipId],
  });
  if (results.rows.length > 0) {
    return convert(results.rows[0]);
  } else {
    return {
      bungieMembershipId,
      state: MigrationState.Postgres,
      lastStateChangeAt: 0,
      attemptCount: 0,
    };
  }
}

function convert(row: MigrationStateRow): MigrationStateInfo {
  return {
    bungieMembershipId: row.membership_id,
    state: row.state,
    lastStateChangeAt: row.last_state_change_at.getTime(),
    attemptCount: row.attempt_count,
    lastError: row.last_error ?? undefined,
  };
}

export function startMigrationToStately(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<void> {
  return updateMigrationState(
    client,
    bungieMembershipId,
    MigrationState.MigratingToStately,
    MigrationState.Postgres,
    true,
  );
}

export function finishMigrationToStately(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<void> {
  return updateMigrationState(
    client,
    bungieMembershipId,
    MigrationState.Stately,
    MigrationState.MigratingToStately,
    false,
  );
}

export function abortMigrationToStately(
  client: ClientBase,
  bungieMembershipId: number,
  err: string,
): Promise<void> {
  return updateMigrationState(
    client,
    bungieMembershipId,
    MigrationState.Postgres,
    MigrationState.MigratingToStately,
    false,
    err,
  );
}

async function updateMigrationState(
  client: ClientBase,
  bungieMembershipId: number,
  state: MigrationState,
  expectedState: MigrationState,
  incrementAttempt = true,
  err?: string,
): Promise<void> {
  // Postgres upserts are awkward but nice to have
  const response = await client.query({
    name: 'update_migration_state',
    text: `insert into migration_state (membership_id, state, last_state_change_at, attempt_count, last_error) VALUES ($1, $2, current_timestamp, $3, $4)
on conflict (membership_id)
do update set state = $2, last_state_change_at = current_timestamp, attempt_count = migration_state.attempt_count + $3, last_error = coalesce($4, migration_state.last_error)
where migration_state.state = $5`,
    values: [bungieMembershipId, state, incrementAttempt ? 1 : 0, err ?? null, expectedState],
  });
  if (response.rowCount === 0) {
    throw new Error('Migration state was not in expected state');
  }
}

// Mostly for tests and delete-my-data
export async function deleteMigrationState(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<void> {
  await client.query({
    name: 'delete_migration_state',
    text: 'DELETE FROM migration_state WHERE membership_id = $1',
    values: [bungieMembershipId],
  });
}

const forceStatelyMembershipIds = new Set([
  // Ben
  7094,
  // Test user
  1234,
]);

const dialPercentage = 0.1; // 0 - 1.0

// This would be better as a uniform hash but this is good enough for now
function isUserDialedIn(bungieMembershipId: number) {
  return (bungieMembershipId % 10000) / 10000 < dialPercentage;
}

export async function getDesiredMigrationState(migrationState: MigrationStateInfo) {
  // TODO: use a uniform hash and a percentage dial to control this
  const desiredState =
    forceStatelyMembershipIds.has(migrationState.bungieMembershipId) ||
    isUserDialedIn(migrationState.bungieMembershipId)
      ? MigrationState.Stately
      : MigrationState.Postgres;

  if (desiredState === migrationState.state) {
    return migrationState.state;
  }

  if (
    desiredState === MigrationState.Stately &&
    migrationState.state === MigrationState.Postgres &&
    migrationState.attemptCount >= MAX_MIGRATION_ATTEMPTS
  ) {
    return MigrationState.Postgres;
  }

  if (
    migrationState.state === MigrationState.MigratingToStately &&
    // If we've been in this state for more than 15 minutes, just move on
    migrationState.lastStateChangeAt < Date.now() - 1000 * 60 * 15
  ) {
    await transaction(async (client) => {
      abortMigrationToStately(client, migrationState.bungieMembershipId, 'Migration timed out');
    });
    return MigrationState.Postgres;
  }

  if (migrationState.state === MigrationState.MigratingToStately) {
    throw new Error('Unable to update - please wait a bit and try again.');
  }

  return desiredState;
}

/**
 * Wrap the migration process - start a migration, run fn(), finish the
 * migration. Abort on failure.
 */
export async function doMigration(
  bungieMembershipId: number,
  fn: () => Promise<void>,
  onBeforeFinish?: (client: ClientBase) => Promise<any>,
): Promise<void> {
  try {
    metrics.increment('migration.start.count');
    await transaction(async (client) => {
      await startMigrationToStately(client, bungieMembershipId);
    });
    await fn();
    await transaction(async (client) => {
      await onBeforeFinish?.(client);
      await finishMigrationToStately(client, bungieMembershipId);
    });
    metrics.increment('migration.finish.count');
  } catch (e) {
    console.error('Stately migration failed', e);
    await transaction(async (client) => {
      await abortMigrationToStately(
        client,
        bungieMembershipId,
        e instanceof Error ? e.message : 'Unknown error',
      );
    });
    metrics.increment('migration.abort.count');
    throw e;
  }
}
