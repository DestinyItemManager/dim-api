import { transaction } from '../../db/index.js';
import { deleteLoadoutShare, getLoadoutShares } from '../../db/loadout-share-queries.js';
import { addLoadoutSharesForMigration } from '../loadout-share-queries.js';

export async function migrateLoadoutShareChunk() {
  await transaction(async (db) => {
    const loadouts = await getLoadoutShares(db, 10);
    await addLoadoutSharesForMigration(loadouts);
    for (const loadout of loadouts) {
      await deleteLoadoutShare(db, loadout.shareId);
    }
  });
}
