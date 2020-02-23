import asyncHandler from 'express-async-handler';
import { transaction } from '../db';
import { deleteSettings } from '../db/settings-queries';
import { deleteAllLoadouts } from '../db/loadouts-queries';
import { deleteAllItemAnnotations } from '../db/item-annotations-queries';
import { ClientBase } from 'pg';
import { recordAuditLog } from '../db/audit-log-queries';

/**
 * Delete My Data - this allows a user to wipe all their data from DIM storage.
 */
export const deleteAllDataHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId } = req.user!;
  const { id: appId } = req.dimApp!;

  const result = await transaction(async (client) => {
    const deleted = await deleteAllData(client, bungieMembershipId);
    await recordAuditLog(client, bungieMembershipId, {
      type: 'delete_all',
      payload: {},
      createdBy: appId
    });
    return deleted;
  });

  // default 200 OK
  res.status(200).send({
    status: 'Success',
    deleted: result
  });
});

export async function deleteAllData(
  client: ClientBase,
  bungieMembershipId: number
) {
  return {
    settings: (await deleteSettings(client, bungieMembershipId)).rowCount,
    loadouts: (await deleteAllLoadouts(client, bungieMembershipId)).rowCount,
    tags: (await deleteAllItemAnnotations(client, bungieMembershipId)).rowCount
  };
}
