import asyncHandler from 'express-async-handler';
import { getUser } from '../utils';
import { pool } from '../db';
import { deleteSettings } from '../db/settings-queries';
import { deleteAllLoadouts } from '../db/loadouts-queries';
import { deleteAllItemAnnotations } from '../db/item-annotations-queries';

/**
 * Delete My Data - this allows a user to wipe all their data from DIM storage.
 */
export const deleteAllDataHandler = asyncHandler(async (req, res) => {
  const user = getUser(req);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await deleteSettings(client, user.bungieMembershipId);
    await deleteAllLoadouts(client, user.bungieMembershipId);
    await deleteAllItemAnnotations(client, user.bungieMembershipId);

    await client.query('COMMIT');

    // default 200 OK
    res.status(200).send({
      Status: 'Success'
    });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});
