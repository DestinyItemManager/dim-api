import asyncHandler from 'express-async-handler';
import { readTransaction } from '../db/index.js';
import { getAllItemAnnotationsForUser } from '../db/item-annotations-queries.js';
import { getItemHashTagsForProfile } from '../db/item-hash-tags-queries.js';
import { getAllLoadoutsForUser } from '../db/loadouts-queries.js';
import { getMigrationState, MigrationState } from '../db/migration-state-queries.js';
import { getSearchesForUser } from '../db/searches-queries.js';
import { getSettings } from '../db/settings-queries.js';
import { getAllTrackedTriumphsForUser } from '../db/triumphs-queries.js';
import { ExportResponse } from '../shapes/export.js';
import { UserInfo } from '../shapes/user.js';
import { exportDataForUser } from '../stately/bulk-queries.js';

export const exportHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId, profileIds } = req.user as UserInfo;

  const migrationState = await readTransaction(async (client) =>
    getMigrationState(client, bungieMembershipId),
  );

  let response: ExportResponse;
  switch (migrationState.state) {
    case MigrationState.Postgres:
    case MigrationState.MigratingToStately: // in-progress migration is the same as PG
      response = await pgExport(bungieMembershipId);
      break;
    case MigrationState.Stately:
      response = await exportDataForUser(bungieMembershipId, profileIds);
      break;
    default:
      // invalid state
      throw new Error(`Unable to export data - please wait a bit and try again.`);
  }

  // Instruct CF not to cache this
  res.set('Cache-Control', 'no-cache, no-store, max-age=0');
  res.send(response);
});

async function pgExport(bungieMembershipId: number): Promise<ExportResponse> {
  const response = await readTransaction(async (client) => {
    const settings = await getSettings(client, bungieMembershipId);
    const loadouts = await getAllLoadoutsForUser(client, bungieMembershipId);
    const itemAnnotations = await getAllItemAnnotationsForUser(client, bungieMembershipId);
    const itemHashTags = await getItemHashTagsForProfile(client, bungieMembershipId);
    const triumphs = await getAllTrackedTriumphsForUser(client, bungieMembershipId);
    const searches = await getSearchesForUser(client, bungieMembershipId);

    const response: ExportResponse = {
      settings,
      loadouts,
      tags: itemAnnotations,
      itemHashTags,
      triumphs,
      searches,
    };
    return response;
  });
  return response;
}
