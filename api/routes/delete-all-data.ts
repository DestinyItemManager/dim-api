import asyncHandler from 'express-async-handler';
import { DeleteAllResponse } from '../shapes/delete-all.js';
import { UserInfo } from '../shapes/user.js';
import { deleteAllDataForUser } from '../stately/bulk-queries.js';

/**
 * Delete My Data - this allows a user to wipe all their data from DIM storage.
 */
export const deleteAllDataHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId, profileIds } = req.user as UserInfo;

  // const migrationState = await readTransaction(async (client) =>
  //   getMigrationState(client, bungieMembershipId),
  // );

  let result: DeleteAllResponse['deleted'];
  result = await deleteAllDataForUser(bungieMembershipId, profileIds);

  // switch (migrationState.state) {
  //   case MigrationState.Postgres:
  //     // Also delete from Stately, just to honor the "no data left here" promise
  //     try {
  //       await deleteAllDataForUser(bungieMembershipId, profileIds);
  //     } catch (e) {
  //       console.error('Error deleting data from Stately', e);
  //     }
  //     result = await transaction(async (client) => deleteAllData(client, bungieMembershipId));
  //     break;
  //   case MigrationState.Stately:
  //     // Also delete from Postgres, just to honor the "no data left here" promise
  //     try {
  //       await transaction(async (client) => deleteAllData(client, bungieMembershipId));
  //     } catch (e) {
  //       console.error('Error deleting data from Postgres', e);
  //     }
  //     result = await deleteAllDataForUser(bungieMembershipId, profileIds);
  //     break;
  //   default:
  //     // We're in the middle of a migration
  //     throw new Error(`Unable to delete data - please wait a bit and try again.`);
  // }

  // default 200 OK
  res.status(200).send({
    deleted: result,
  });
});

// /** Postgres delete-all-data implementation just individually deletes from each table */
// export async function deleteAllData(
//   client: ClientBase,
//   bungieMembershipId: number,
// ): Promise<DeleteAllResponse['deleted']> {
//   return {
//     settings: (await deleteSettings(client, bungieMembershipId)).rowCount!,
//     loadouts: (await deleteAllLoadouts(client, bungieMembershipId)).rowCount!,
//     tags: (await deleteAllItemAnnotations(client, bungieMembershipId)).rowCount!,
//     itemHashTags: (await deleteAllItemHashTags(client, bungieMembershipId)).rowCount!,
//     triumphs: (await deleteAllTrackedTriumphs(client, bungieMembershipId)).rowCount!,
//     searches: (await deleteAllSearches(client, bungieMembershipId)).rowCount!,
//   };
// }
