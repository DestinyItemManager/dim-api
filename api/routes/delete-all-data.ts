import asyncHandler from 'express-async-handler';
import { ClientBase } from 'pg';
import { transaction } from '../db/index.js';
import { softDeleteAllItemAnnotations } from '../db/item-annotations-queries.js';
import { softDeleteAllItemHashTags } from '../db/item-hash-tags-queries.js';
import { softDeleteAllLoadouts } from '../db/loadouts-queries.js';
import { deleteMigrationState } from '../db/migration-state-queries.js';
import { softDeleteAllSearches } from '../db/searches-queries.js';
import { deleteSettings } from '../db/settings-queries.js';
import { softDeleteAllTrackedTriumphs } from '../db/triumphs-queries.js';
import { DeleteAllResponse } from '../shapes/delete-all.js';
import { DestinyVersion } from '../shapes/general.js';
import { UserInfo } from '../shapes/user.js';
import { deleteAllDataForUser } from '../stately/bulk-queries.js';

/**
 * Delete My Data - this allows a user to wipe all their data from DIM storage.
 */
export const deleteAllDataHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId, profileIds } = req.user as UserInfo;

  let result = await deleteAllDataForUser(bungieMembershipId, profileIds);

  await transaction(async (client) => {
    await deleteSettings(client, bungieMembershipId);
    for (const profileId of profileIds) {
      const pgResult1 = await deleteAllData(client, profileId, 1);
      result = mergeResult(result, pgResult1);
      const pgResult2 = await deleteAllData(client, profileId, 2);
      result = mergeResult(result, pgResult2);

      await deleteMigrationState(client, profileId);
    }
  });

  // default 200 OK
  res.status(200).send({
    deleted: result,
  });
});

function mergeResult(
  base: DeleteAllResponse['deleted'],
  addition: DeleteAllResponse['deleted'],
): DeleteAllResponse['deleted'] {
  return {
    settings: base.settings + addition.settings,
    loadouts: base.loadouts + addition.loadouts,
    tags: base.tags + addition.tags,
    itemHashTags: base.itemHashTags + addition.itemHashTags,
    triumphs: base.triumphs + addition.triumphs,
    searches: base.searches + addition.searches,
  };
}

/** Postgres delete-all-data implementation just individually deletes from each table */
export async function deleteAllData(
  client: ClientBase,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
): Promise<DeleteAllResponse['deleted']> {
  return {
    settings: 0,
    loadouts: (await softDeleteAllLoadouts(client, platformMembershipId, destinyVersion)).rowCount!,
    tags: (await softDeleteAllItemAnnotations(client, platformMembershipId, destinyVersion))
      .rowCount!,
    itemHashTags:
      destinyVersion === 2
        ? (await softDeleteAllItemHashTags(client, platformMembershipId)).rowCount!
        : 0,
    triumphs:
      destinyVersion === 2
        ? (await softDeleteAllTrackedTriumphs(client, platformMembershipId)).rowCount!
        : 0,
    searches: (await softDeleteAllSearches(client, platformMembershipId, destinyVersion)).rowCount!,
  };
}
