import asyncHandler from 'express-async-handler';
import { transaction } from '../db';
import { deleteSettings } from '../db/settings-queries';
import { deleteAllLoadouts } from '../db/loadouts-queries';
import { deleteAllItemAnnotations } from '../db/item-annotations-queries';
import { ClientBase } from 'pg';
import { DeleteAllResponse } from '../shapes/delete-all';
import { deleteAllTrackedTriumphs } from '../db/triumphs-queries';
import { deleteAllSearches } from '../db/searches-queries';
import { deleteAllItemHashTags } from '../db/item-hash-tags-queries';

/**
 * Delete My Data - this allows a user to wipe all their data from DIM storage.
 */
export const deleteAllDataHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId } = req.user!;

  const result = await transaction(async (client) => {
    const deleted = await deleteAllData(client, bungieMembershipId);
    return deleted;
  });

  // default 200 OK
  res.status(200).send({
    deleted: result,
  });
});

export async function deleteAllData(
  client: ClientBase,
  bungieMembershipId: number
): Promise<DeleteAllResponse['deleted']> {
  return {
    settings: (await deleteSettings(client, bungieMembershipId)).rowCount,
    loadouts: (await deleteAllLoadouts(client, bungieMembershipId)).rowCount,
    tags: (await deleteAllItemAnnotations(client, bungieMembershipId)).rowCount,
    itemHashTags: (await deleteAllItemHashTags(client, bungieMembershipId))
      .rowCount,
    triumphs: (await deleteAllTrackedTriumphs(client, bungieMembershipId))
      .rowCount,
    searches: (await deleteAllSearches(client, bungieMembershipId)).rowCount,
  };
}
