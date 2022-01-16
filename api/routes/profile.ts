import asyncHandler from 'express-async-handler';
import { readTransaction } from '../db';
import { getItemAnnotationsForProfile } from '../db/item-annotations-queries';
import { getItemHashTagsForProfile } from '../db/item-hash-tags-queries';
import { getLoadoutsForProfile } from '../db/loadouts-queries';
import { getSearchesForProfile } from '../db/searches-queries';
import { getSettings } from '../db/settings-queries';
import { getTrackedTriumphsForProfile } from '../db/triumphs-queries';
import { metrics } from '../metrics';
import { DestinyVersion } from '../shapes/general';
import { ProfileResponse } from '../shapes/profile';
import { defaultSettings } from '../shapes/settings';
import { badRequest } from '../utils';

export const profileHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId } = req.user!;
  const { id: appId } = req.dimApp!;
  metrics.counter('profile.app.' + appId, 1);

  const platformMembershipId = req.query.platformMembershipId as
    | string
    | undefined;
  const destinyVersion: DestinyVersion = req.query.destinyVersion
    ? (parseInt(req.query.destinyVersion.toString(), 10) as DestinyVersion)
    : 2;
  const components = ((req.query.components as string) || '').split(/\s*,\s*/);

  if (!components) {
    badRequest(res, 'No components provided');
    return;
  }

  if (platformMembershipId && !/^\d+$/.test(platformMembershipId)) {
    badRequest(res, 'Platform membership ID should be a number');
    return;
  }

  // TODO: Maybe do parallel non-transactional reads instead
  await readTransaction(async (client) => {
    const response: ProfileResponse = {};

    if (components.includes('settings')) {
      const start = new Date();
      const storedSettings = await getSettings(client, bungieMembershipId);

      // Clean out deprecated settings (TODO purge from DB)
      delete storedSettings['allowIdPostToDtr'];
      delete storedSettings['colorA11y'];
      delete storedSettings['itemDetails'];
      delete storedSettings['itemPickerEquip'];
      delete storedSettings['itemSort'];
      delete storedSettings['loAssumeMasterwork'];
      delete storedSettings['loLockItemEnergyType'];
      delete storedSettings['loMinPower'];
      delete storedSettings['loMinStatTotal'];
      delete storedSettings['loStatSortOrder'];
      delete storedSettings['loUpgradeSpendTier'];
      delete storedSettings['reviewsModeSelection'];
      delete storedSettings['reviewsPlatformSelectionV2'];
      delete storedSettings['showReviews'];

      response.settings = {
        ...defaultSettings,
        ...storedSettings,
      };
      metrics.timing('profile.settings', start);
    }

    if (components.includes('loadouts')) {
      if (!platformMembershipId) {
        badRequest(res, 'Need a platformMembershipId to return loadouts');
        return;
      }
      const start = new Date();
      response.loadouts = await getLoadoutsForProfile(
        client,
        bungieMembershipId,
        platformMembershipId,
        destinyVersion
      );
      metrics.timing('profile.loadouts.numReturned', response.loadouts.length);
      metrics.timing('profile.loadouts', start);
    }

    if (components.includes('tags')) {
      if (!platformMembershipId) {
        badRequest(
          res,
          'Need a platformMembershipId to return item annotations'
        );
        return;
      }
      const start = new Date();
      response.tags = await getItemAnnotationsForProfile(
        client,
        bungieMembershipId,
        platformMembershipId,
        destinyVersion
      );
      metrics.timing('profile.tags.numReturned', response.tags.length);
      metrics.timing('profile.tags', start);
    }

    if (components.includes('hashtags')) {
      const start = new Date();
      response.itemHashTags = await getItemHashTagsForProfile(
        client,
        bungieMembershipId
      );
      metrics.timing(
        'profile.hashtags.numReturned',
        response.itemHashTags.length
      );
      metrics.timing('profile.hashtags', start);
    }

    if (destinyVersion === 2 && components.includes('triumphs')) {
      if (!platformMembershipId) {
        badRequest(res, 'Need a platformMembershipId to return triumphs');
        return;
      }
      const start = new Date();
      response.triumphs = await getTrackedTriumphsForProfile(
        client,
        bungieMembershipId,
        platformMembershipId
      );
      metrics.timing('profile.triumphs.numReturned', response.triumphs.length);
      metrics.timing('profile.triumphs', start);
    }

    if (components.includes('searches')) {
      const start = new Date();
      response.searches = await getSearchesForProfile(
        client,
        bungieMembershipId,
        destinyVersion
      );
      metrics.timing('profile.searches.numReturned', response.searches.length);
      metrics.timing('profile.searches', start);
    }

    // Instruct CF not to cache this
    res.set('Cache-Control', 'no-cache, max-age=0');
    res.send(response);
  });
});
