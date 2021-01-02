import asyncHandler from 'express-async-handler';
import { readTransaction } from '../db';
import { getSettings } from '../db/settings-queries';
import { getLoadoutsForProfile } from '../db/loadouts-queries';
import { getItemAnnotationsForProfile } from '../db/item-annotations-queries';
import { badRequest } from '../utils';
import { ProfileResponse } from '../shapes/profile';
import { DestinyVersion } from '../shapes/general';
import { defaultSettings } from '../shapes/settings';
import { getTrackedTriumphsForProfile } from '../db/triumphs-queries';
import { getSearchesForProfile } from '../db/searches-queries';
import { metrics } from '../metrics';
import { getItemHashTagsForProfile } from '../db/item-hash-tags-queries';

export const profileHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId } = req.user!;

  const platformMembershipId = req.query.platformMembershipId as string;
  const destinyVersion: DestinyVersion = req.query.destinyVersion
    ? (parseInt(req.query.destinyVersion.toString(), 10) as DestinyVersion)
    : 2;
  const components = ((req.query.components as string) || '').split(/\s*,\s*/);

  if (!components) {
    badRequest(res, 'No components provided');
    return;
  }

  // TODO: Maybe do parallel non-transactional reads instead
  await readTransaction(async (client) => {
    const response: ProfileResponse = {};

    if (components.includes('settings')) {
      const start = new Date();
      response.settings = {
        ...defaultSettings,
        ...(await getSettings(client, bungieMembershipId)),
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
      metrics.timing('profile.tags', start);
    }

    if (components.includes('hashtags')) {
      const start = new Date();
      response.itemHashTags = await getItemHashTagsForProfile(
        client,
        bungieMembershipId
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
      metrics.timing('profile.triumphs', start);
    }

    if (components.includes('searches')) {
      const start = new Date();
      response.searches = await getSearchesForProfile(
        client,
        bungieMembershipId,
        destinyVersion
      );
      metrics.histogram('searches.numReturned', response.searches.length);
      metrics.timing('profile.searches', start);
    }

    // Instruct CF not to cache this
    res.set('Cache-Control', 'no-cache, max-age=0');
    res.send(response);
  });
});
