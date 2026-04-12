import asyncHandler from 'express-async-handler';
import { ClientBase } from 'pg';
import { readTransaction } from '../db/index.js';
import { getItemAnnotationsForProfile } from '../db/item-annotations-queries.js';
import { getItemHashTagsForProfile } from '../db/item-hash-tags-queries.js';
import { getLoadoutsForProfile } from '../db/loadouts-queries.js';
import { getMigrationState, MigrationState } from '../db/migration-state-queries.js';
import { getSearchesForProfile } from '../db/searches-queries.js';
import { getSettings as getSettingsFromPostgres } from '../db/settings-queries.js';
import { getTrackedTriumphsForProfile } from '../db/triumphs-queries.js';
import { ExportResponse } from '../shapes/export.js';
import { DestinyVersion } from '../shapes/general.js';
import { defaultSettings, Settings } from '../shapes/settings.js';
import { UserInfo } from '../shapes/user.js';
import { exportDataForProfile } from '../stately/bulk-queries.js';
import { getSettings } from '../stately/settings-queries.js';
import { subtractObject } from '../utils.js';

export const exportHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId, profileIds } = req.user as UserInfo;

  const settings = await exportSettings(bungieMembershipId);

  let response: ExportResponse = {
    settings,
    loadouts: [],
    tags: [],
    itemHashTags: [],
    triumphs: [],
    searches: [],
  };

  for (const profileId of profileIds) {
    const migrationState = await readTransaction(async (client) =>
      getMigrationState(client, profileId),
    );

    let partialResponse: ExportResponse;
    if (migrationState.state === MigrationState.Postgres) {
      partialResponse = await readTransaction(async (client) => {
        const d1Response = await pgExport(client, profileId, 1);
        const d2Response = await pgExport(client, profileId, 2);
        return mergeResponses(d1Response, d2Response);
      });
    } else {
      partialResponse = await exportDataForProfile(profileId);
    }

    response = mergeResponses(response, partialResponse);
  }

  // Instruct CF not to cache this
  res.set('Cache-Control', 'no-cache, no-store, max-age=0');
  res.send(response);
});

function mergeResponses(base: ExportResponse, addition: ExportResponse): ExportResponse {
  return {
    settings: base.settings,
    loadouts: [...base.loadouts, ...addition.loadouts],
    tags: [...base.tags, ...addition.tags],
    itemHashTags: [
      ...base.itemHashTags,
      ...addition.itemHashTags,
    ] as ExportResponse['itemHashTags'],
    triumphs: [...base.triumphs, ...addition.triumphs],
    searches: [...base.searches, ...addition.searches],
  };
}

export async function exportSettings(
  bungieMembershipId: number,
): Promise<ExportResponse['settings']> {
  let settings: Partial<Settings>;
  const pgSettings = await readTransaction((client) =>
    getSettingsFromPostgres(client, bungieMembershipId),
  );
  if (pgSettings) {
    settings = pgSettings.settings;
  } else {
    settings = subtractObject((await getSettings(bungieMembershipId)) ?? {}, defaultSettings);
  }
  return settings;
}

export async function pgExport(
  client: ClientBase,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
): Promise<ExportResponse> {
  const loadouts = await getLoadoutsForProfile(client, platformMembershipId, destinyVersion);
  const itemAnnotations = await getItemAnnotationsForProfile(
    client,
    platformMembershipId,
    destinyVersion,
  );
  const itemHashTags =
    destinyVersion === 2 ? await getItemHashTagsForProfile(client, platformMembershipId) : [];
  const triumphs =
    destinyVersion === 2 ? await getTrackedTriumphsForProfile(client, platformMembershipId) : [];
  const searches = await getSearchesForProfile(client, platformMembershipId, destinyVersion);

  const response: ExportResponse = {
    settings: {},
    loadouts: loadouts.map((loadout) => ({
      platformMembershipId,
      destinyVersion,
      loadout,
    })),
    tags: itemAnnotations.map((annotation) => ({
      platformMembershipId,
      destinyVersion,
      annotation,
    })),
    itemHashTags: itemHashTags.map((itemHashTag) => ({
      platformMembershipId,
      itemHashTag,
    })),
    triumphs:
      triumphs.length > 0
        ? [
            {
              platformMembershipId,
              triumphs,
            },
          ]
        : [],
    searches: searches.map((search) => ({
      platformMembershipId,
      destinyVersion,
      search,
    })),
  };
  return response;
}
