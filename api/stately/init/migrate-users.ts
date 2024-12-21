import { readTransaction } from '../../db/index.js';
import { getUsersToMigrate } from '../../db/migration-state-queries.js';
import { delay } from '../../utils.js';
import { migrateUser } from '../migrator/user.js';

while (true) {
  try {
    const bungieMembershipIds = await readTransaction(async (client) => getUsersToMigrate(client));
    for (const bungieMembershipId of bungieMembershipIds) {
      try {
        await migrateUser(bungieMembershipId);
        console.log(`Migrated user ${bungieMembershipId}`);
      } catch (e) {
        console.error(`Error migrating user ${bungieMembershipId}: ${e}`);
      }
    }
  } catch (e) {
    console.error(`Error getting users to migrate: ${e}`);
    await delay(1000);
  }
}
