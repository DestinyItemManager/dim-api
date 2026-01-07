import asyncHandler from 'express-async-handler';
import { UserInfo } from '../shapes/user.js';
import { exportDataForUser } from '../stately/bulk-queries.js';

export const exportHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId, profileIds } = req.user as UserInfo;

  // const migrationState = await readTransaction(async (client) =>
  //   getMigrationState(client, bungieMembershipId),
  // );

  const response = await exportDataForUser(bungieMembershipId, profileIds);

  // switch (migrationState.state) {
  //   case MigrationState.Postgres:
  //   case MigrationState.MigratingToStately: // in-progress migration is the same as PG
  //     response = await pgExport(bungieMembershipId);
  //     break;
  //   case MigrationState.Stately:
  //     response = await exportDataForUser(bungieMembershipId, profileIds);
  //     break;
  //   default:
  //     // invalid state
  //     throw new Error(`Unable to export data - please wait a bit and try again.`);
  // }

  // Instruct CF not to cache this
  res.set('Cache-Control', 'no-cache, no-store, max-age=0');
  res.send(response);
});

// export async function pgExport(bungieMembershipId: number): Promise<ExportResponse> {
//   const response = await readTransaction(async (client) => {
//     const settings = await getSettings(client, bungieMembershipId);
//     const loadouts = await getAllLoadoutsForUser(client, bungieMembershipId);
//     const itemAnnotations = await getAllItemAnnotationsForUser(client, bungieMembershipId);
//     const itemHashTags = await getItemHashTagsForProfile(client, bungieMembershipId);
//     const triumphs = await getAllTrackedTriumphsForUser(client, bungieMembershipId);
//     const searches = await getSearchesForUser(client, bungieMembershipId);

//     const response: ExportResponse = {
//       settings,
//       loadouts,
//       tags: itemAnnotations,
//       itemHashTags,
//       triumphs,
//       searches,
//     };
//     return response;
//   });
//   return response;
// }
