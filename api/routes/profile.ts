import * as Sentry from '@sentry/node';
import { ListToken } from '@stately-cloud/client';
import express from 'express';
import asyncHandler from 'express-async-handler';
import { readTransaction } from '../db/index.js';
import { getSettings } from '../db/settings-queries.js';
import { metrics } from '../metrics/index.js';
import { ApiApp } from '../shapes/app.js';
import { DestinyVersion } from '../shapes/general.js';
import { ProfileResponse } from '../shapes/profile.js';
import { defaultSettings } from '../shapes/settings.js';
import { UserInfo } from '../shapes/user.js';
import { getProfile, syncProfile } from '../stately/bulk-queries.js';
import { cannedSearches } from '../stately/searches-queries.js';
import { querySettings, syncSettings } from '../stately/settings-queries.js';
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

  const platformMembershipId =
    typeof req.query.platformMembershipId === 'string' ? req.query.platformMembershipId : undefined;

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

  const components = (typeof req.query.components === 'string' ? req.query.components : '').split(
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

  let syncTokens = extractSyncToken(
    typeof req.query.sync === 'string' ? req.query.sync : undefined,
  );

  // Ignore old sync tokens
  if (syncTokens && (syncTokens.all || syncTokens.profile)) {
    syncTokens = undefined;
  }

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
    Sentry.captureException(e, {
      extra: {
        syncTokens: req.query.sync,
        components,
        platformMembershipId,
      },
    });
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

  if (response.sync) {
    // There's no point to storing the sync response
    res.set('Cache-Control', 'no-store');
  } else {
    // Instruct CF not to cache this for longer than a minute
    res.set('Cache-Control', 'public, max-age=60');
    res.set('Expires', new Date(Date.now() + 60 * 1000).toUTCString());
  }
  res.send(response);
});

function extractSyncToken(syncTokenParam: string | undefined) {
  if (syncTokenParam) {
    // Fix for light.gg incorrectly encoding the sync token
    syncTokenParam = syncTokenParam.replaceAll(' ', '+');
    if (
      syncTokenParam.includes(' ') ||
      syncTokenParam.includes('\n') ||
      syncTokenParam.includes('%20')
    ) {
      Sentry.captureMessage('Incoming sync token contains invalid characters', {
        extra: { syncToken: syncTokenParam },
      });
    }

    try {
      const tokenMap = JSON.parse(syncTokenParam) as { [component: string]: string | number };
      return Object.entries(tokenMap).reduce<{ [component: string]: Buffer | number }>(
        (acc, [component, token]) => {
          acc[component] = typeof token === 'string' ? Buffer.from(token, 'base64') : token;
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
  components: (ProfileComponent | 'p')[],
  bungieMembershipId: number,
  platformMembershipId: string | undefined,
  destinyVersion: DestinyVersion,
  incomingSyncTokens?: { [component: string]: Buffer | number },
) {
  let response: ProfileResponse = {
    sync: Boolean(incomingSyncTokens),
  };
  const timerPrefix = response.sync ? 'profileSync' : 'profileStately';
  const counterPrefix = response.sync ? 'sync' : 'stately';
  const syncTokens: { [component: string]: string | number } = {};
  const addSyncToken = (
    name: string,
    token: ListToken | { canSync: boolean; tokenData: number },
  ) => {
    if (token.canSync) {
      syncTokens[name] =
        token.tokenData instanceof Uint8Array
          ? Buffer.from(token.tokenData).toString('base64')
          : token.tokenData;
    }
  };
  const getSyncToken = <T extends number | Buffer>(name: string) => {
    const tokenData = incomingSyncTokens?.[name];
    if (incomingSyncTokens && !tokenData) {
      throw new Error(`Missing sync token: ${name}`);
    }
    return tokenData as T | undefined;
  };

  // We'll accumulate promises and await them all at the end
  const promises: Promise<void>[] = [];

  if (components.includes('settings')) {
    // TODO: should settings be stored under profile too?? maybe primary profile ID?
    promises.push(
      (async () => {
        // Load settings from Stately. If they're there, you're done. Otherwise load from Postgres.
        const start = new Date();

        const now = Date.now();
        // TODO: Should add the token to the query to avoid fetching if unchanged
        const pgSettings = await readTransaction(async (pgClient) =>
          getSettings(pgClient, bungieMembershipId),
        );
        if (pgSettings) {
          const tokenData = getSyncToken<number>('s');
          if (tokenData === undefined || pgSettings.lastModifiedAt > Number(tokenData)) {
            response.settings = { ...defaultSettings, ...pgSettings.settings };
          }
          addSyncToken('s', { canSync: true, tokenData: pgSettings?.lastModifiedAt ?? now });
        } else {
          const tokenData = getSyncToken<Buffer>('settings');
          const { settings: storedSettings, token: settingsToken } = tokenData
            ? await syncSettings(tokenData)
            : await querySettings(bungieMembershipId);
          response.settings = storedSettings;
          addSyncToken('settings', settingsToken);
        }

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
    // Replace the individual components with a bulk fetch
    components = components.includes('settings') ? ['settings', 'p'] : ['p'];
  }

  const loadComponent = (
    name: Exclude<ProfileComponent, 'settings'> | 'p',
    suffix: string,
    handleEmpty: () => void,
  ) => {
    if (components.includes(name)) {
      if (!platformMembershipId) {
        badRequest(res, `Need a platformMembershipId to return ${name}`);
        return;
      }
      promises.push(
        (async () => {
          const start = new Date();
          const tokenData = getSyncToken<Buffer>(name);
          const { profile, token } = tokenData
            ? await syncProfile(tokenData)
            : await getProfile(platformMembershipId, destinyVersion, suffix);
          response = { ...response, ...profile };
          if (!tokenData) {
            handleEmpty();
          }
          addSyncToken(name, token);
          metrics.timing(`${timerPrefix}.${name}`, start);
        })(),
      );
    }
  };

  loadComponent('p', '', () => {
    response.loadouts ??= [];
    response.searches ??= [];
    response.tags ??= [];
    response.itemHashTags ??= [];
    response.triumphs ??= [];
    response.searches ??= [];
  });
  loadComponent('loadouts', '/loadout', () => {
    response.loadouts ??= [];
  });
  loadComponent('tags', '/ia', () => {
    response.tags ??= [];
  });
  if (destinyVersion === 2) {
    loadComponent('hashtags', '/iht', () => {
      response.itemHashTags ??= [];
    });
  }
  loadComponent('triumphs', '/triumph', () => {
    response.triumphs ??= [];
  });
  loadComponent('searches', '/search', () => {
    response.searches ??= [];
  });

  await Promise.all(promises);

  if (response.loadouts?.length) {
    metrics.timing(`${counterPrefix}.loadouts.numReturned`, response.loadouts?.length ?? 0);
  }
  if (response.tags?.length) {
    metrics.timing(`${counterPrefix}.tags.numReturned`, response.tags?.length ?? 0);
  }
  if (response.itemHashTags?.length) {
    metrics.timing(`${counterPrefix}.hashtags.numReturned`, response.itemHashTags?.length ?? 0);
  }
  if (response.triumphs?.length) {
    metrics.timing(`${counterPrefix}.triumphs.numReturned`, response.triumphs?.length ?? 0);
  }
  if (response.searches?.length) {
    metrics.timing(`${counterPrefix}.searches.numReturned`, response.searches?.length ?? 0);
  }

  if (response.searches !== undefined && !response.sync) {
    response.searches.push(...cannedSearches(destinyVersion));
  }

  response.syncToken = serializeSyncToken(syncTokens);
  if (
    response.syncToken?.includes(' ') ||
    response.syncToken?.includes('\n') ||
    response.syncToken?.includes('%20')
  ) {
    Sentry.captureMessage('Outgoing sync token contains invalid characters', {
      extra: { syncToken: response.syncToken },
    });
  }
  metrics.increment(response.sync ? `profile.response.sync` : `profile.response.full`, 1);
  return response;
}

function serializeSyncToken(syncTokens: { [component: string]: string | number }) {
  return JSON.stringify(syncTokens);
}
