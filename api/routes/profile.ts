import * as Sentry from '@sentry/node';
import express from 'express';
import asyncHandler from 'express-async-handler';
import { readTransaction } from '../db/index.js';
import { getItemAnnotationsForProfile } from '../db/item-annotations-queries.js';
import { getItemHashTagsForProfile } from '../db/item-hash-tags-queries.js';
import { getLoadoutsForProfile } from '../db/loadouts-queries.js';
import { getMigrationState, MigrationState } from '../db/migration-state-queries.js';
import { getSearchesForProfile } from '../db/searches-queries.js';
import { getSettings } from '../db/settings-queries.js';
import { getTrackedTriumphsForProfile } from '../db/triumphs-queries.js';
import { metrics } from '../metrics/index.js';
import { ApiApp } from '../shapes/app.js';
import { DestinyVersion } from '../shapes/general.js';
import { ProfileResponse } from '../shapes/profile.js';
import { defaultSettings } from '../shapes/settings.js';
import { UserInfo } from '../shapes/user.js';
import { getProfile } from '../stately/bulk-queries.js';
import { getItemAnnotationsForProfile as getItemAnnotationsForProfileStately } from '../stately/item-annotations-queries.js';
import { getItemHashTagsForProfile as getItemHashTagsForProfileStately } from '../stately/item-hash-tags-queries.js';
import { getLoadoutsForProfile as getLoadoutsForProfileStately } from '../stately/loadouts-queries.js';
import { getSearchesForProfile as getSearchesForProfileStately } from '../stately/searches-queries.js';
import { getSettings as getSettingsStately } from '../stately/settings-queries.js';
import { getTrackedTriumphsForProfile as getTrackedTriumphsForProfileStately } from '../stately/triumphs-queries.js';
import { badRequest, checkPlatformMembershipId, isValidPlatformMembershipId } from '../utils.js';

type ProfileComponent = 'settings' | 'loadouts' | 'tags' | 'hashtags' | 'triumphs' | 'searches';

const validComponents = new Set<ProfileComponent>([
  'settings',
  'loadouts',
  'tags',
  'hashtags',
  'triumphs',
  'searches',
]);

export const profileHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId, profileIds } = req.user as UserInfo;
  const { id: appId } = req.dimApp as ApiApp;
  metrics.increment(`profile.app.${appId}`, 1);

  const platformMembershipId = req.query.platformMembershipId?.toString();

  if (platformMembershipId && !isValidPlatformMembershipId(platformMembershipId)) {
    badRequest(res, `platformMembershipId ${platformMembershipId} is not in the right format`);
    return;
  }

  checkPlatformMembershipId(platformMembershipId, profileIds, 'profile');

  const destinyVersion: DestinyVersion =
    req.query.destinyVersion && typeof req.query.destinyVersion === 'string'
      ? (parseInt(req.query.destinyVersion.toString(), 10) as DestinyVersion)
      : 2;

  if (destinyVersion !== 1 && destinyVersion !== 2) {
    badRequest(res, `destinyVersion ${destinyVersion as number} is not in the right format`);
    return;
  }

  const components = (req.query.components?.toString() || '').split(
    /\s*,\s*/,
  ) as ProfileComponent[];

  if (components.some((c) => !validComponents.has(c))) {
    badRequest(
      res,
      `[${components.filter((c) => !validComponents.has(c)).join(', ')}] are not valid components`,
    );
    return;
  }

  if (!components) {
    badRequest(res, 'No components provided');
    return;
  }

  const migrationState = await readTransaction(async (client) =>
    getMigrationState(client, bungieMembershipId),
  );
  let response: ProfileResponse | undefined;
  switch (migrationState.state) {
    case MigrationState.Postgres:
    case MigrationState.MigratingToStately: // in-progress migration is the same as PG
      response = await pgProfile(
        res,
        components,
        bungieMembershipId,
        platformMembershipId,
        destinyVersion,
        appId,
      );
      break;
    case MigrationState.Stately:
      response = await statelyProfile(
        res,
        components,
        bungieMembershipId,
        platformMembershipId,
        destinyVersion,
      );
      break;
    default:
      // invalid state
      throw new Error(`Unable to get profile - please wait a bit and try again.`);
  }

  if (!response) {
    return; // we've already responded
  }

  // Instruct CF not to cache this for longer than a minute
  res.set('Cache-Control', 'public, max-age=60');
  res.set('Expires', new Date(Date.now() + 60 * 1000).toUTCString());
  res.send(response);
});

async function pgProfile(
  res: express.Response,
  components: string[],
  bungieMembershipId: number,
  platformMembershipId: string | undefined,
  destinyVersion: DestinyVersion,
  appId: string,
) {
  return readTransaction(async (client) => {
    const response: ProfileResponse = {};

    if (components.includes('settings')) {
      // TODO: should settings be stored under profile too?? maybe primary profile ID?
      const start = new Date();
      const storedSettings = await getSettings(client, bungieMembershipId);

      // Clean out deprecated settings (TODO purge from DB)
      delete (storedSettings as Record<string, unknown>).allowIdPostToDtr;
      delete (storedSettings as Record<string, unknown>).colorA11y;
      delete (storedSettings as Record<string, unknown>).itemDetails;
      delete (storedSettings as Record<string, unknown>).itemPickerEquip;
      delete (storedSettings as Record<string, unknown>).itemSort;
      delete (storedSettings as Record<string, unknown>).loAssumeMasterwork;
      delete (storedSettings as Record<string, unknown>).loLockItemEnergyType;
      delete (storedSettings as Record<string, unknown>).loMinPower;
      delete (storedSettings as Record<string, unknown>).loMinStatTotal;
      delete (storedSettings as Record<string, unknown>).loStatSortOrder;
      delete (storedSettings as Record<string, unknown>).loUpgradeSpendTier;
      delete (storedSettings as Record<string, unknown>).reviewsModeSelection;
      delete (storedSettings as Record<string, unknown>).reviewsPlatformSelectionV2;
      delete (storedSettings as Record<string, unknown>).showReviews;

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
        destinyVersion,
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
        destinyVersion,
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
        platformMembershipId,
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
}

// TODO: Probably could enable allowStale, since profiles are cached anyway
// TODO: It'd be nice to pass a signal in so we can abort all the parallel fetches
// TODO: right now we get each component separately, but we should do it in one big query, at least for DIM
async function statelyProfile(
  res: express.Response,
  components: ProfileComponent[],
  bungieMembershipId: number,
  platformMembershipId: string | undefined,
  destinyVersion: DestinyVersion,
) {
  const response: ProfileResponse = {};

  // We'll accumulate promises and await them all at the end
  const promises: Promise<void>[] = [];
  if (components.includes('settings')) {
    // TODO: should settings be stored under profile too?? maybe primary profile ID?
    promises.push(
      (async () => {
        const start = new Date();
        const storedSettings = await getSettingsStately(bungieMembershipId);
        response.settings = storedSettings;
        metrics.timing('profile.settings', start);
      })(),
    );
  }

  // Special case: DIM wants everything, so we can get it in a single query
  if (
    platformMembershipId &&
    (['loadouts', 'tags', 'hashtags', 'triumphs', 'searches'] as const).every((c) =>
      components.includes(c),
    )
  ) {
    const start = new Date();
    const profileResponse = await getProfile(platformMembershipId, destinyVersion);
    metrics.timing('profile.all', start);
    await Promise.all(promises); // wait for settings
    metrics.timing('profile.loadouts.numReturned', profileResponse.loadouts?.length ?? 0);
    metrics.timing('profile.tags.numReturned', profileResponse.tags?.length ?? 0);
    metrics.timing('profile.hashtags.numReturned', profileResponse.itemHashTags?.length ?? 0);
    metrics.timing('profile.triumphs.numReturned', profileResponse.triumphs?.length ?? 0);
    metrics.timing('profile.searches.numReturned', profileResponse.searches?.length ?? 0);
    return { ...response, ...profileResponse };
  }

  if (components.includes('loadouts')) {
    if (!platformMembershipId) {
      badRequest(res, 'Need a platformMembershipId to return loadouts');
      return;
    }
    promises.push(
      (async () => {
        const start = new Date();
        response.loadouts = await getLoadoutsForProfileStately(
          platformMembershipId,
          destinyVersion,
        );
        metrics.timing('profile.loadouts.numReturned', response.loadouts.length);
        metrics.timing('profile.loadouts', start);
      })(),
    );
  }

  if (components.includes('tags')) {
    if (!platformMembershipId) {
      badRequest(res, 'Need a platformMembershipId to return tags');
      return;
    }
    promises.push(
      (async () => {
        const start = new Date();
        response.tags = await getItemAnnotationsForProfileStately(
          platformMembershipId,
          destinyVersion,
        );
        metrics.timing('profile.tags.numReturned', response.tags.length);
        metrics.timing('profile.tags', start);
      })(),
    );
  }

  if (components.includes('hashtags')) {
    if (!platformMembershipId) {
      badRequest(res, 'Need a platformMembershipId to return hashtags');
      return;
    }
    promises.push(
      (async () => {
        const start = new Date();
        response.itemHashTags = await getItemHashTagsForProfileStately(platformMembershipId);
        metrics.timing('profile.hashtags.numReturned', response.itemHashTags.length);
        metrics.timing('profile.hashtags', start);
      })(),
    );
  }

  if (destinyVersion === 2 && components.includes('triumphs')) {
    if (!platformMembershipId) {
      badRequest(res, 'Need a platformMembershipId to return triumphs');
      return;
    }
    promises.push(
      (async () => {
        const start = new Date();
        response.triumphs = await getTrackedTriumphsForProfileStately(platformMembershipId);
        metrics.timing('profile.triumphs.numReturned', response.triumphs.length);
        metrics.timing('profile.triumphs', start);
      })(),
    );
  }

  if (components.includes('searches')) {
    if (!platformMembershipId) {
      badRequest(res, 'Need a platformMembershipId to return searches');
      return;
    }
    promises.push(
      (async () => {
        const start = new Date();
        response.searches = await getSearchesForProfileStately(
          platformMembershipId,
          destinyVersion,
        );
        metrics.timing('profile.searches.numReturned', response.searches.length);
        metrics.timing('profile.searches', start);
      })(),
    );
  }

  await Promise.all(promises);
  return response;
}
