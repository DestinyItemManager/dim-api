import asyncHandler from 'express-async-handler';
import { readTransaction } from '../db';
import { getAllItemAnnotationsForUser } from '../db/item-annotations-queries';
import { getItemHashTagsForProfile } from '../db/item-hash-tags-queries';
import { getAllLoadoutsForUser } from '../db/loadouts-queries';
import { getSearchesForUser } from '../db/searches-queries';
import { getSettings } from '../db/settings-queries';
import { getAllTrackedTriumphsForUser } from '../db/triumphs-queries';
import { ExportResponse } from '../shapes/export';

export const exportHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId } = req.user!;

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

  // Instruct CF not to cache this
  res.set('Cache-Control', 'no-cache, max-age=0');
  res.send(response);
});
