import asyncHandler from 'express-async-handler';
import path from 'path';
import { readTransaction } from '../db';
import { getLoadoutShare } from '../db/loadout-share-queries';

/**
 * Save a loadout to be shared via a dim.gg link.
 */
export const loadoutShareViewHandler = asyncHandler(async (req, res) => {
  const { shareId } = req.params;

  await readTransaction(async (client) => {
    const loadout = getLoadoutShare(client, shareId);

    if (!loadout) {
      res.status(404).sendFile(path.join(__dirname + '/views/loadout404.html'));
    }

    // TODO: how to localize??
    // TODO: cache control
    // TODO: vary on lang?
    res.render('loadout', { loadout });
  });
});
