import { chunk } from 'es-toolkit';
import { readTransaction } from '../../db/index.js';
import { getUsersToMigrate } from '../../db/migration-state-queries.js';
import { delay } from '../../utils.js';
import { migrateUser } from '../migrator/user.js';

while (true) {
  try {
    const bungieMembershipIds = await readTransaction(async (client) => getUsersToMigrate(client));
    if (bungieMembershipIds.length === 0) {
      console.log('No users to migrate');
      break;
    }
    for (const idChunk of chunk(bungieMembershipIds, 10)) {
      await Promise.all(
        idChunk.map(async (bungieMembershipId) => {
          try {
            await migrateUser(bungieMembershipId);
            console.log(`Migrated user ${bungieMembershipId}`);
          } catch (e) {
            console.error(`Error migrating user ${bungieMembershipId}: ${e}`);
          }
        }),
      );
    }
  } catch (e) {
    if (e instanceof Error) {
      console.error(`Error getting users to migrate: ${e}`);
    }
    await delay(1000);
  }
}
