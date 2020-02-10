import asyncHandler from 'express-async-handler';
import { getUser } from '../utils';
import { pool } from '../db';
import { getSettings } from '../db/settings-queries';
import { getAllLoadoutsForUser } from '../db/loadouts-queries';
import { getAllItemAnnotationsForUser } from '../db/item-annotations-queries';

export const exportHandler = asyncHandler(async (req, res) => {
  const user = getUser(req);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const settings = await getSettings(client, user.bungieMembershipId);
    const loadouts = await getAllLoadoutsForUser(
      client,
      user.bungieMembershipId
    );
    const itemAnnotations = await getAllItemAnnotationsForUser(
      client,
      user.bungieMembershipId
    );

    // Instruct CF not to cache this
    res.set('Cache-Control', 'no-cache, max-age=0');
    res.send({
      settings,
      loadouts,
      itemAnnotations
    });
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});
