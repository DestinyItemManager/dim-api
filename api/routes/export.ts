import asyncHandler from 'express-async-handler';
import { readTransaction } from '../db';
import { getSettings } from '../db/settings-queries';
import { getAllLoadoutsForUser } from '../db/loadouts-queries';
import { getAllItemAnnotationsForUser } from '../db/item-annotations-queries';
import { ExportResponse } from '../shapes/export';
import { getAllTrackedTriumphsForUser } from '../db/triumphs-queries';
import { getItemHashTagsForProfile } from '../db/item-hash-tags-queries';

export const exportHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId } = req.user!;

  await readTransaction(async (client) => {
    const settings = await getSettings(client, bungieMembershipId);
    const loadouts = await getAllLoadoutsForUser(client, bungieMembershipId);
    const itemAnnotations = await getAllItemAnnotationsForUser(
      client,
      bungieMembershipId
    );
    const itemHashTags = await getItemHashTagsForProfile(
      client,
      bungieMembershipId
    );
    const triumphs = await getAllTrackedTriumphsForUser(
      client,
      bungieMembershipId
    );

    const response: ExportResponse = {
      settings,
      loadouts,
      tags: itemAnnotations,
      itemHashTags,
      triumphs,
    };

    // Instruct CF not to cache this
    res.set('Cache-Control', 'no-cache, max-age=0');
    res.send(response);
  });
});
