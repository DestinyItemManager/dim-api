import asyncHandler from 'express-async-handler';
import _ from 'lodash';
import { readTransaction, transaction } from '../db/index.js';
import { updateItemAnnotation } from '../db/item-annotations-queries.js';
import { updateItemHashTag } from '../db/item-hash-tags-queries.js';
import { updateLoadout } from '../db/loadouts-queries.js';
import {
  doMigration,
  getDesiredMigrationState,
  getMigrationState,
  MigrationState,
} from '../db/migration-state-queries.js';
import { importSearch } from '../db/searches-queries.js';
import { replaceSettings } from '../db/settings-queries.js';
import { trackTriumph } from '../db/triumphs-queries.js';
import { ApiApp } from '../shapes/app.js';
import { ExportResponse } from '../shapes/export.js';
import { DestinyVersion } from '../shapes/general.js';
import { ImportResponse } from '../shapes/import.js';
import { ItemAnnotation, ItemHashTag } from '../shapes/item-annotations.js';
import { Loadout } from '../shapes/loadouts.js';
import { SearchType } from '../shapes/search.js';
import { defaultSettings, Settings } from '../shapes/settings.js';
import { UserInfo } from '../shapes/user.js';
import { deleteAllDataForUser } from '../stately/bulk-queries.js';
import { importTags } from '../stately/item-annotations-queries.js';
import { importHashTags } from '../stately/item-hash-tags-queries.js';
import { importLoadouts } from '../stately/loadouts-queries.js';
import { importSearches } from '../stately/searches-queries.js';
import { replaceSettings as replaceSettingsStately } from '../stately/settings-queries.js';
import { importTriumphs } from '../stately/triumphs-queries.js';
import { badRequest } from '../utils.js';
import { deleteAllData } from './delete-all-data.js';

export const importHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId, profileIds } = req.user as UserInfo;
  const { id: appId } = req.dimApp as ApiApp;

  // Support only new API exports
  const importData = req.body as ExportResponse;

  const { settings, loadouts, itemAnnotations, triumphs, searches, itemHashTags } =
    extractImportData(importData);

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

  const migrationState = await readTransaction(async (client) =>
    getMigrationState(client, bungieMembershipId),
  );

  // this is a great time to do the migration
  const desiredMigrationState = await getDesiredMigrationState(migrationState);
  const shouldMigrateToStately =
    desiredMigrationState === MigrationState.Stately &&
    migrationState.state !== desiredMigrationState;

  let numTriumphs = 0;
  const importToStately = async () => {
    numTriumphs = await statelyImport(
      bungieMembershipId,
      profileIds,
      settings,
      loadouts,
      itemAnnotations,
      triumphs,
      searches,
      itemHashTags,
    );
  };

  switch (migrationState.state) {
    case MigrationState.Postgres:
      if (shouldMigrateToStately) {
        await doMigration(bungieMembershipId, importToStately, async (client) =>
          deleteAllData(client, bungieMembershipId),
        );
      } else {
        numTriumphs = await pgImport(
          bungieMembershipId,
          appId,
          settings,
          loadouts,
          itemAnnotations,
          triumphs,
          searches,
          itemHashTags,
        );
      }
      break;
    case MigrationState.Stately:
      await importToStately();
      break;
    default:
      // in-progress migration
      badRequest(res, `Unable to import data - please wait a bit and try again.`);
      return;
  }

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

export function extractImportData(importData: ExportResponse) {
  const settings = extractSettings(importData);
  const loadouts = extractLoadouts(importData);
  const itemAnnotations = extractItemAnnotations(importData);
  const triumphs = importData.triumphs || [];
  const searches = extractSearches(importData);
  const itemHashTags = importData.itemHashTags || [];

  return {
    settings,
    loadouts,
    itemAnnotations,
    triumphs,
    searches,
    itemHashTags,
  };
}

async function pgImport(
  bungieMembershipId: number,
  appId: string,
  settings: Partial<Settings>,
  loadouts: PlatformLoadout[],
  itemAnnotations: PlatformItemAnnotation[],
  triumphs: ExportResponse['triumphs'],
  searches: ExportResponse['searches'],
  itemHashTags: ItemHashTag[],
): Promise<number> {
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
        search.search.type ?? SearchType.Item,
      );
    }
  });

  return numTriumphs;
}

export async function statelyImport(
  bungieMembershipId: number,
  platformMembershipIds: string[],
  settings: Partial<Settings>,
  loadouts: PlatformLoadout[],
  itemAnnotations: PlatformItemAnnotation[],
  triumphs: ExportResponse['triumphs'],
  searches: ExportResponse['searches'],
  itemHashTags: ItemHashTag[],
): Promise<number> {
  // TODO: this could all be parallelized but it's not very performance-sensitive

  let numTriumphs = 0;
  await deleteAllDataForUser(bungieMembershipId, platformMembershipIds);
  await replaceSettingsStately(bungieMembershipId, { ...defaultSettings, ...settings });
  await importLoadouts(loadouts);
  await importTags(itemAnnotations);
  for (const platformMembershipId of platformMembershipIds) {
    // TODO: I guess save them to each platform? I should really refactor the
    // import shape to have hashtags per platform, or merge/unique them.
    await importHashTags(platformMembershipId, itemHashTags);
  }
  if (Array.isArray(triumphs)) {
    for (const triumphData of triumphs) {
      if (Array.isArray(triumphData?.triumphs)) {
        await importTriumphs(triumphData.platformMembershipId, triumphData.triumphs);
        numTriumphs += triumphData.triumphs.length;
      }
    }
  }
  for (const platformMembershipId of platformMembershipIds) {
    // TODO: I guess save them to each platform? I should really refactor the
    // import shape to have searches per platform, or merge/unique them.
    await importSearches(platformMembershipId, searches);
  }
  return numTriumphs;
}

/** Produce a new object that's only the key/values of obj that are also keys in defaults and which have values different from defaults. */
function subtractObject<T extends object>(obj: Partial<T>, defaults: T): Partial<T> {
  const result: Partial<T> = {};
  if (obj) {
    for (const key in defaults) {
      if (obj[key] !== undefined && obj[key] !== defaults[key]) {
        result[key] = obj[key];
      }
    }
  }
  return result;
}

function extractSettings(importData: ExportResponse): Partial<Settings> {
  return subtractObject(importData.settings, defaultSettings);
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
