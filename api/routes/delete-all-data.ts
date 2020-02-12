import asyncHandler from 'express-async-handler';
import { getUser, UserInfo } from '../utils';
import { transaction } from '../db';
import { deleteSettings } from '../db/settings-queries';
import { deleteAllLoadouts } from '../db/loadouts-queries';
import { deleteAllItemAnnotations } from '../db/item-annotations-queries';
import { ClientBase } from 'pg';

/**
 * Delete My Data - this allows a user to wipe all their data from DIM storage.
 */
export const deleteAllDataHandler = asyncHandler(async (req, res) => {
  const user = getUser(req);

  await transaction((client) => deleteAllData(client, user));

  // default 200 OK
  res.status(200).send({
    Status: 'Success'
  });
});

export async function deleteAllData(client: ClientBase, user: UserInfo) {
  await deleteSettings(client, user.bungieMembershipId);
  await deleteAllLoadouts(client, user.bungieMembershipId);
  await deleteAllItemAnnotations(client, user.bungieMembershipId);
}
