import * as Sentry from '@sentry/node';
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
import { badRequest, checkPlatformMembershipId, isValidPlatformMembershipId } from '../utils';

const validComponents = new Set([
  'settings',
  'loadouts',
  'tags',
  'hashtags',
  'triumphs',
  'searches',
]);

export const profileHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId, profileIds } = req.user!;
  const { id: appId } = req.dimApp!;
  metrics.increment('profile.app.' + appId, 1);

  const platformMembershipId = req.query.platformMembershipId?.toString();

  if (platformMembershipId && !isValidPlatformMembershipId(platformMembershipId)) {
    badRequest(res, `platformMembershipId ${platformMembershipId} is not in the right format`);
    return;
  }

  checkPlatformMembershipId(platformMembershipId, profileIds, 'profile');

  const destinyVersion: DestinyVersion = req.query.destinyVersion
    ? (parseInt(req.query.destinyVersion.toString(), 10) as DestinyVersion)
    : 2;

  if (destinyVersion !== 1 && destinyVersion !== 2) {
    badRequest(res, `destinyVersion ${destinyVersion} is not in the right format`);
    return;
  }

  const components = (req.query.components?.toString() || '').split(/\s*,\s*/);

  if (components.some((c) => !validComponents.has(c))) {
    badRequest(
      res,
      `[${components.filter((c) => !validComponents.has(c)).join(', ')}] are not valid components`
    );
    return;
  }

  if (!components) {
    badRequest(res, 'No components provided');
    return;
  }

  // TODO: Maybe do parallel non-transactional reads instead
  const response = await readTransaction(async (client) => {
    const response: ProfileResponse = {};

    if (components.includes('settings')) {
      // TODO: should settings be stored under profile too?? maybe primary profile ID?
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
        badRequest(res, 'Need a platformMembershipId to return item annotations');
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
      response.itemHashTags = await getItemHashTagsForProfile(client, bungieMembershipId);
      metrics.timing('profile.hashtags.numReturned', response.itemHashTags.length);
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
      response.searches = await getSearchesForProfile(client, bungieMembershipId, destinyVersion);
      metrics.timing('profile.searches.numReturned', response.searches.length);
      metrics.timing('profile.searches', start);
    }

    if ((response.tags?.length ?? 0) > 1000) {
      Sentry.captureMessage('User with a lot of tags', {
        extra: {
          bungieMembershipId,
          destinyVersion,
          appId,
          tagsLength: response.tags?.length,
        },
      });
    }

    return response;
  });

  // Instruct CF not to cache this for longer than a minute
  res.set('Cache-Control', 'max-age=60');
  res.send(response);
});
