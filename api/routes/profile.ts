import * as Sentry from '@sentry/node';
import { ListToken } from '@stately-cloud/client';
import express from 'express';
import asyncHandler from 'express-async-handler';
import { metrics } from '../metrics/index.js';
import { ApiApp } from '../shapes/app.js';
import { DestinyVersion } from '../shapes/general.js';
import { ProfileResponse } from '../shapes/profile.js';
import { UserInfo } from '../shapes/user.js';
import { getProfile, syncProfile } from '../stately/bulk-queries.js';
import {
  getItemAnnotationsForProfile as getItemAnnotationsForProfileStately,
  syncItemAnnotations,
} from '../stately/item-annotations-queries.js';
import {
  getItemHashTagsForProfile as getItemHashTagsForProfileStately,
  syncItemHashTags,
} from '../stately/item-hash-tags-queries.js';
import {
  getLoadoutsForProfile as getLoadoutsForProfileStately,
  syncLoadouts,
} from '../stately/loadouts-queries.js';
import {
  getSearchesForProfile as getSearchesForProfileStately,
  syncSearches,
} from '../stately/searches-queries.js';
import { querySettings, syncSettings } from '../stately/settings-queries.js';
import {
  getTrackedTriumphsForProfile as getTrackedTriumphsForProfileStately,
  syncTrackedTriumphs,
} from '../stately/triumphs-queries.js';
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

  if (!checkPlatformMembershipId(platformMembershipId, profileIds)) {
    // This should force a re-auth
    res.status(401).send({
      error: 'UnknownProfileId',
      message: `platformMembershipId ${platformMembershipId} is not one of the profiles associated with your Bungie.net account. Try logging out and logging back in.`,
    });
    return;
  }

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

  const syncTokens = extractSyncToken(req.query.sync?.toString());

  let response: ProfileResponse | undefined;
  try {
    response = await statelyProfile(
      res,
      components,
      bungieMembershipId,
      platformMembershipId,
      destinyVersion,
      syncTokens,
    );
  } catch (e) {
    Sentry.captureException(e, { extra: { syncTokens, components, platformMembershipId } });
    if (syncTokens) {
      // Start over without sync tokens
      response = await statelyProfile(
        res,
        components,
        bungieMembershipId,
        platformMembershipId,
        destinyVersion,
      );
    }
  }

  if (!response) {
    return; // we've already responded
  }

  // Instruct CF not to cache this for longer than a minute
  res.set('Cache-Control', 'public, max-age=60');
  res.set('Expires', new Date(Date.now() + 60 * 1000).toUTCString());
  res.send(response);
});

function extractSyncToken(syncTokenParam: string | undefined) {
  if (syncTokenParam) {
    try {
      const tokenMap = JSON.parse(syncTokenParam) as { [component: string]: string };
      return Object.entries(tokenMap).reduce<{ [component: string]: Buffer }>(
        (acc, [component, token]) => {
          acc[component] = Buffer.from(token, 'base64');
          return acc;
        },
        {},
      );
    } catch (e) {
      Sentry.captureException(e, { extra: { syncTokenParam } });
    }
  }
}

// TODO: It'd be nice to pass a signal in so we can abort all the parallel fetches
async function statelyProfile(
  res: express.Response,
  components: ProfileComponent[],
  bungieMembershipId: number,
  platformMembershipId: string | undefined,
  destinyVersion: DestinyVersion,
  incomingSyncTokens?: { [component: string]: Buffer },
) {
  const response: ProfileResponse = {
    sync: Boolean(incomingSyncTokens),
  };
  const timerPrefix = response.sync ? 'profileSync' : 'profileStately';
  const counterPrefix = response.sync ? 'sync' : 'stately';
  const syncTokens: { [component: string]: string } = {};
  const addSyncToken = (name: string, token: ListToken) => {
    if (token.canSync) {
      syncTokens[name] = Buffer.from(token.tokenData).toString('base64');
    }
  };
  const getSyncToken = (name: string) => {
    const tokenData = incomingSyncTokens?.settings;
    if (incomingSyncTokens && !tokenData) {
      throw new Error(`Missing sync token: ${name}`);
    }
    return tokenData;
  };

  // We'll accumulate promises and await them all at the end
  const promises: Promise<void>[] = [];
  if (components.includes('settings')) {
    // TODO: should settings be stored under profile too?? maybe primary profile ID?
    promises.push(
      (async () => {
        const start = new Date();
        const tokenData = getSyncToken('settings');
        const { settings: storedSettings, token: settingsToken } = tokenData
          ? await syncSettings(tokenData)
          : await querySettings(bungieMembershipId);
        response.settings = storedSettings;
        addSyncToken('settings', settingsToken);
        metrics.timing(`${timerPrefix}.settings`, start);
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
    const tokenData = getSyncToken('profile');
    const { profile: profileResponse, token: profileToken } = tokenData
      ? await syncProfile(tokenData)
      : await getProfile(platformMembershipId, destinyVersion);
    metrics.timing(`${timerPrefix}.allComponents`, start);
    await Promise.all(promises); // wait for settings
    metrics.timing(`${counterPrefix}.loadouts.numReturned`, profileResponse.loadouts?.length ?? 0);
    metrics.timing(`${counterPrefix}.tags.numReturned`, profileResponse.tags?.length ?? 0);
    metrics.timing(
      `${counterPrefix}.hashtags.numReturned`,
      profileResponse.itemHashTags?.length ?? 0,
    );
    metrics.timing(`${counterPrefix}.triumphs.numReturned`, profileResponse.triumphs?.length ?? 0);
    metrics.timing(`${counterPrefix}.searches.numReturned`, profileResponse.searches?.length ?? 0);
    addSyncToken('profile', profileToken);
    response.syncToken = serializeSyncToken(syncTokens);
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
        const tokenData = getSyncToken('loadouts');
        const { loadouts, token, deletedLoadoutIds } = tokenData
          ? await syncLoadouts(tokenData)
          : await getLoadoutsForProfileStately(platformMembershipId, destinyVersion);
        response.loadouts = loadouts;
        response.deletedLoadoutIds = deletedLoadoutIds;
        addSyncToken('loadouts', token);
        metrics.timing(`${counterPrefix}.loadouts.numReturned`, response.loadouts.length);
        metrics.timing(`${timerPrefix}.loadouts`, start);
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
        const tokenData = getSyncToken('tags');
        const { tags, token, deletedTagsIds } = tokenData
          ? await syncItemAnnotations(tokenData)
          : await getItemAnnotationsForProfileStately(platformMembershipId, destinyVersion);
        response.tags = tags;
        response.deletedTagsIds = deletedTagsIds;
        addSyncToken('tags', token);
        metrics.timing(`${counterPrefix}.tags.numReturned`, response.tags.length);
        metrics.timing(`${timerPrefix}.tags`, start);
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
        const tokenData = getSyncToken('hashtags');
        const { hashTags, token, deletedItemHashTagHashes } = tokenData
          ? await syncItemHashTags(tokenData)
          : await getItemHashTagsForProfileStately(platformMembershipId);
        response.itemHashTags = hashTags;
        response.deletedItemHashTagHashes = deletedItemHashTagHashes;
        addSyncToken('hashtags', token);
        metrics.timing(`${counterPrefix}.hashtags.numReturned`, response.itemHashTags.length);
        metrics.timing(`${timerPrefix}.hashtags`, start);
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
        const tokenData = getSyncToken('triumphs');
        const { triumphs, token, deletedTriumphs } = tokenData
          ? await syncTrackedTriumphs(tokenData)
          : await getTrackedTriumphsForProfileStately(platformMembershipId);
        response.triumphs = triumphs;
        response.deletedTriumphs = deletedTriumphs;
        addSyncToken('triumphs', token);
        metrics.timing(`${counterPrefix}.triumphs.numReturned`, response.triumphs.length);
        metrics.timing(`${timerPrefix}.triumphs`, start);
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
        const tokenData = getSyncToken('searches');
        const { searches, token, deletedSearchHashes } = tokenData
          ? await syncSearches(tokenData)
          : await getSearchesForProfileStately(platformMembershipId, destinyVersion);
        response.searches = searches;
        response.deletedSearchHashes = deletedSearchHashes;
        addSyncToken('searches', token);
        metrics.timing(`${counterPrefix}.searches.numReturned`, response.searches.length);
        metrics.timing(`${timerPrefix}.searches`, start);
      })(),
    );
  }

  await Promise.all(promises);
  response.syncToken = serializeSyncToken(syncTokens);
  return response;
}

function serializeSyncToken(syncTokens: { [component: string]: string }) {
  return JSON.stringify(syncTokens);
}
