import asyncHandler from 'express-async-handler';
import { readTransaction } from '../db';
import { getUser } from '../utils';
import { getSettings } from '../db/settings-queries';
import { getAllLoadoutsForUser } from '../db/loadouts-queries';
import { getAllItemAnnotationsForUser } from '../db/item-annotations-queries';

export const profileHandler = asyncHandler(async (req, res) => {
  const user = getUser(req);

  // TODO: Maybe do parallel non-transactional reads instead
  await readTransaction(async (client) => {
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
  });
});
