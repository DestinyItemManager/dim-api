import asyncHandler from 'express-async-handler';
import _ from 'lodash';
import { transaction } from '../db/index.js';
import { updateItemAnnotation } from '../db/item-annotations-queries.js';
import { updateItemHashTag } from '../db/item-hash-tags-queries.js';
import { updateLoadout } from '../db/loadouts-queries.js';
import { importSearch } from '../db/searches-queries.js';
import { replaceSettings } from '../db/settings-queries.js';
import { trackTriumph } from '../db/triumphs-queries.js';
import { ExportResponse } from '../shapes/export.js';
import { DestinyVersion } from '../shapes/general.js';
import { ImportResponse } from '../shapes/import.js';
import { ItemAnnotation } from '../shapes/item-annotations.js';
import { Loadout } from '../shapes/loadouts.js';
import { defaultSettings, Settings } from '../shapes/settings.js';
import { badRequest } from '../utils.js';
import { deleteAllData } from './delete-all-data.js';

export const importHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId } = req.user;
  const { id: appId } = req.dimApp;

  // Support only new API exports
  const importData = req.body as ExportResponse;

  const settings = extractSettings(importData);
  const loadouts = extractLoadouts(importData);
  const itemAnnotations = extractItemAnnotations(importData);
  const triumphs = importData.triumphs || [];
  const searches = extractSearches(importData);
  const itemHashTags = importData.itemHashTags || [];

  if (
    _.isEmpty(settings) &&
    loadouts.length === 0 &&
    itemAnnotations.length === 0 &&
    triumphs.length === 0 &&
    searches.length === 0
  ) {
    badRequest(res, "Won't import empty data");
    return;
  }

  let numTriumphs = 0;

  await transaction(async (client) => {
    await deleteAllData(client, bungieMembershipId);

    // TODO: pass a list of keys that are being set to default?
    await replaceSettings(client, appId, bungieMembershipId, settings);

    // TODO: query first so we can delete after?
    for (const loadout of loadouts) {
      // For now, ignore ancient loadouts
      if (!loadout.platformMembershipId || !loadout.destinyVersion) {
        continue;
      }
      await updateLoadout(
        client,
        appId,
        bungieMembershipId,
        loadout.platformMembershipId,
        loadout.destinyVersion,
        loadout,
      );
    }

    // TODO: query first so we can delete after?
    for (const annotation of itemAnnotations) {
      await updateItemAnnotation(
        client,
        appId,
        bungieMembershipId,
        annotation.platformMembershipId,
        annotation.destinyVersion,
        annotation,
      );
    }

    for (const tag of itemHashTags) {
      await updateItemHashTag(client, appId, bungieMembershipId, tag);
    }

    if (Array.isArray(triumphs)) {
      for (const triumphData of triumphs) {
        if (Array.isArray(triumphData?.triumphs)) {
          for (const triumph of triumphData.triumphs) {
            trackTriumph(
              client,
              appId,
              bungieMembershipId,
              triumphData.platformMembershipId,
              triumph,
            );
            numTriumphs++;
          }
        }
      }
    }

    for (const search of searches) {
      importSearch(
        client,
        appId,
        bungieMembershipId,
        search.destinyVersion,
        search.search.query,
        search.search.saved,
        search.search.lastUsage,
        search.search.usageCount,
      );
    }
  });

  const response: ImportResponse = {
    loadouts: loadouts.length,
    tags: itemAnnotations.length,
    triumphs: numTriumphs,
    searches: searches.length,
    itemHashTags: itemHashTags.length,
  };

  // default 200 OK
  res.status(200).send(response);
});

/** Produce a new object that's only the key/values of obj that are also keys in defaults and which have values different from defaults. */
function subtractObject(obj: object | undefined, defaults: object) {
  const result = {};
  if (obj) {
    for (const key in defaults) {
      if (obj[key] !== undefined && obj[key] !== defaults[key]) {
        result[key] = obj[key];
      }
    }
  }
  return result;
}

function extractSettings(importData: ExportResponse): Settings {
  return subtractObject(importData.settings, defaultSettings) as Settings;
}

type PlatformLoadout = Loadout & {
  platformMembershipId: string;
  destinyVersion: DestinyVersion;
};

function extractLoadouts(importData: ExportResponse): PlatformLoadout[] {
  return (
    importData.loadouts?.map((l) => ({
      ...l.loadout,
      platformMembershipId: l.platformMembershipId,
      destinyVersion: l.destinyVersion,
    })) ?? []
  );
}

type PlatformItemAnnotation = ItemAnnotation & {
  platformMembershipId: string;
  destinyVersion: DestinyVersion;
};

function extractItemAnnotations(importData: ExportResponse): PlatformItemAnnotation[] {
  return (
    importData.tags?.map((t) => ({
      ...t.annotation,
      platformMembershipId: t.platformMembershipId,
      destinyVersion: t.destinyVersion || 2,
    })) ?? []
  );
}

function extractSearches(importData: ExportResponse): ExportResponse['searches'] {
  return (importData.searches || []).filter(
    // Filter out pre-filled searches that were never used
    (s) => s.search.usageCount > 0,
  );
}
