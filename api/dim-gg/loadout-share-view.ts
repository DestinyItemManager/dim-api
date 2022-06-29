import asyncHandler from 'express-async-handler';
import path from 'path';
import { transaction } from '../db';
import { getLoadoutShare, recordAccess } from '../db/loadout-share-queries';

/**
 * Save a loadout to be shared via a dim.gg link.
 */
export const loadoutShareViewHandler = asyncHandler(async (req, res) => {
  const { shareId } = req.params;

  const loadout = await transaction(async (client) => {
    const loadout = await getLoadoutShare(client, shareId);
    if (loadout) {
      // Record when this was viewed and increment the view counter. Not using it much for now but I'd like to know.
      await recordAccess(client, shareId);
    }
    return loadout;
  });

  if (!loadout) {
    // Instruct CF to cache for 15 minutes
    res.set('Cache-Control', 'max-age=900');
    res.status(404).sendFile(path.join(__dirname + '/views/loadout404.html'));
    return;
  }

  // TODO: how to localize??
  // TODO: cache control
  // TODO: vary on lang?

  // TODO: generate loadout URLs here
  // TODO: generate preview SVG!
  // TODO: download manifest and images in order to generate preview SVG

  const loadoutsUrlParams = new URLSearchParams({ loadout: JSON.stringify(loadout) }).toString();

  const appShareUrl = `https://app.destinyitemmanager.com/loadouts?${loadoutsUrlParams}`;
  const betaShareUrl = `https://beta.destinyitemmanager.com/loadouts?${loadoutsUrlParams}`;

  const numMods = loadout.parameters?.mods?.length ?? 0;
  const hasFashion = Boolean(loadout.parameters?.modsByBucket);
  const hasSubclass = loadout.equipped.some((i) => i.socketOverrides);
  const hasLoParams =
    loadout.parameters &&
    (loadout.parameters.query ||
      loadout.parameters.exoticArmorHash ||
      loadout.parameters.statConstraints?.some(
        (s) => s.maxTier !== undefined || s.minTier !== undefined
      ));
  const numItems = loadout.equipped.length + loadout.unequipped.length - (hasSubclass ? 1 : 0);

  const description = loadout.notes
    ? loadout.notes.length > 197
      ? loadout.notes.substring(0, 197) + '...'
      : loadout.notes
    : 'Destiny 2 loadout settings shared from DIM';

  // Instruct CF to cache for 5 minutes
  res.set('Cache-Control', 'max-age=300');
  res.render('loadout', {
    loadout,
    appShareUrl,
    betaShareUrl,
    numMods,
    hasFashion,
    hasSubclass,
    hasLoParams,
    description,
    numItems,
  });
});
