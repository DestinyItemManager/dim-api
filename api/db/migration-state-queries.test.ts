import { closeDbPool, transaction } from './index.js';
import {
  abortMigrationToStately,
  deleteMigrationState,
  finishMigrationToStately,
  getMigrationState,
  MigrationState,
  startMigrationToStately,
} from './migration-state-queries.js';

const bungieMembershipId = 4321;

beforeEach(() =>
  transaction(async (client) => {
    await deleteMigrationState(client, bungieMembershipId);
  }),
);

afterAll(() => closeDbPool());

it('handles migration state changes', async () => {
  await transaction(async (client) => {
    // Check initial state
    const migrationState = await getMigrationState(client, bungieMembershipId);
    expect(migrationState.bungieMembershipId).toBe(bungieMembershipId);
    expect(migrationState.state).toBe(MigrationState.Postgres);
    expect(migrationState.attemptCount).toBe(0);
    expect(migrationState.lastError).toBeUndefined();
    expect(migrationState.lastStateChangeAt).toBe(0);

    // Start migration
    await startMigrationToStately(client, bungieMembershipId);

    const migrationState2 = await getMigrationState(client, bungieMembershipId);
    expect(migrationState2.state).toBe(MigrationState.MigratingToStately);
    expect(migrationState2.attemptCount).toBe(1);
    expect(migrationState2.lastError).toBeUndefined();
    expect(migrationState2.lastStateChangeAt).not.toBe(0);

    // Try to start the migration again (should fail)
    await expect(startMigrationToStately(client, bungieMembershipId)).rejects.toThrow();

    // Fail migration
    await abortMigrationToStately(client, bungieMembershipId, 'error message');

    const migrationState3 = await getMigrationState(client, bungieMembershipId);
    expect(migrationState3.state).toBe(MigrationState.Postgres);
    expect(migrationState3.attemptCount).toBe(1);
    expect(migrationState3.lastError).toBe('error message');
    expect(migrationState3.lastStateChangeAt).not.toBe(0);

    // OK start the migration again
    await startMigrationToStately(client, bungieMembershipId);

    const migrationState4 = await getMigrationState(client, bungieMembershipId);
    expect(migrationState4.state).toBe(MigrationState.MigratingToStately);
    expect(migrationState4.attemptCount).toBe(2);
    expect(migrationState4.lastError).toBe('error message');
    expect(migrationState4.lastStateChangeAt).not.toBe(0);

    // Finish migration
    await finishMigrationToStately(client, bungieMembershipId);

    const migrationState5 = await getMigrationState(client, bungieMembershipId);
    expect(migrationState5.state).toBe(MigrationState.Stately);
    expect(migrationState5.attemptCount).toBe(2);
    expect(migrationState5.lastError).toBe('error message');
    expect(migrationState5.lastStateChangeAt).not.toBe(0);
  });
});
