import asyncHandler from 'express-async-handler';
import { ClientBase } from 'pg';
import { readTransaction, transaction } from '../db/index.js';
import { deleteAllItemAnnotations } from '../db/item-annotations-queries.js';
import { deleteAllItemHashTags } from '../db/item-hash-tags-queries.js';
import { deleteAllLoadouts } from '../db/loadouts-queries.js';
import { getMigrationState, MigrationState } from '../db/migration-state-queries.js';
import { deleteAllSearches } from '../db/searches-queries.js';
import { deleteSettings } from '../db/settings-queries.js';
import { deleteAllTrackedTriumphs } from '../db/triumphs-queries.js';
import { DeleteAllResponse } from '../shapes/delete-all.js';
import { UserInfo } from '../shapes/user.js';
import { deleteAllDataForUser } from '../stately/bulk-queries.js';

/**
 * Delete My Data - this allows a user to wipe all their data from DIM storage.
 */
export const deleteAllDataHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId, profileIds } = req.user as UserInfo;

  const migrationState = await readTransaction(async (client) =>
    getMigrationState(client, bungieMembershipId),
  );

  let result: DeleteAllResponse['deleted'];
  switch (migrationState.state) {
    case MigrationState.Postgres:
      result = await transaction(async (client) => deleteAllData(client, bungieMembershipId));
      break;
    case MigrationState.Stately:
      result = await deleteAllDataForUser(bungieMembershipId, profileIds);
      break;
    default:
      // We're in the middle of a migration
      throw new Error(`Unable to delete data - please wait a bit and try again.`);
  }

  // default 200 OK
  res.status(200).send({
    deleted: result,
  });
});

/** Postgres delete-all-data implementation just individually deletes from each table */
export async function deleteAllData(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<DeleteAllResponse['deleted']> {
  return {
    settings: (await deleteSettings(client, bungieMembershipId)).rowCount!,
    loadouts: (await deleteAllLoadouts(client, bungieMembershipId)).rowCount!,
    tags: (await deleteAllItemAnnotations(client, bungieMembershipId)).rowCount!,
    itemHashTags: (await deleteAllItemHashTags(client, bungieMembershipId)).rowCount!,
    triumphs: (await deleteAllTrackedTriumphs(client, bungieMembershipId)).rowCount!,
    searches: (await deleteAllSearches(client, bungieMembershipId)).rowCount!,
  };
}
