import asyncHandler from 'express-async-handler';
import { readTransaction } from '../db';
import { getSettings } from '../db/settings-queries';
import { getAllLoadoutsForUser } from '../db/loadouts-queries';
import { getAllItemAnnotationsForUser } from '../db/item-annotations-queries';

export const profileHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId } = req.user!;

  // TODO: Maybe do parallel non-transactional reads instead
  await readTransaction(async (client) => {
    const settings = await getSettings(client, bungieMembershipId);
    const loadouts = await getAllLoadoutsForUser(client, bungieMembershipId);
    const itemAnnotations = await getAllItemAnnotationsForUser(
      client,
      bungieMembershipId
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
