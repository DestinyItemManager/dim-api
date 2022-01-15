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
    const loadout = await getLoadoutShare(client, shareId);

    if (!loadout) {
      res.status(404).sendFile(path.join(__dirname + '/views/loadout404.html'));
      return;
    }

    // TODO: how to localize??
    // TODO: cache control
    // TODO: vary on lang?

    // TODO: generate loadout URLs here
    // TODO: generate preview SVG!
    // TODO: download manifest and images in order to generate preview SVG

    const p: Record<string, string> = {
      class: loadout.classType.toString(),
    };
    if (loadout.parameters) {
      p.p = JSON.stringify(loadout.parameters);
    }
    if (loadout.notes) {
      p.n = loadout.notes;
    }
    const urlParams = new URLSearchParams(p);
    const shareUrl = `https://app.destinyitemmanager.com/optimizer?${urlParams}`;

    res.render('loadout', { loadout, shareUrl });
  });
});
