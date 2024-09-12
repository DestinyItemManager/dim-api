import { ClientBase } from 'pg';

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
]);
export function getDesiredMigrationState(bungieMembershipId: number): MigrationState {
  // TODO: use a uniform hash and a percentage dial to control this

  return forceStatelyMembershipIds.has(bungieMembershipId)
    ? MigrationState.Stately
    : MigrationState.Postgres;
}
