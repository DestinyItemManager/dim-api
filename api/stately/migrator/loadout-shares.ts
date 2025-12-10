// import { transaction } from '../../db/index.js';
// import { deleteLoadoutShares, getLoadoutShares } from '../../db/loadout-share-queries.js';
// import { addLoadoutSharesForMigration } from '../loadout-share-queries.js';

// export async function migrateLoadoutShareChunk() {
//   await transaction(async (db) => {
//     const loadouts = await getLoadoutShares(db, 50);
//     await Promise.all(loadouts.map((loadout) => addLoadoutSharesForMigration([loadout])));
//     console.log('Added to stately');
//     await deleteLoadoutShares(
//       db,
//       loadouts.map((loadout) => loadout.shareId),
//     );
//   });
// }
