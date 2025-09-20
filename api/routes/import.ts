import { uniqBy } from 'es-toolkit';
import { isEmpty } from 'es-toolkit/compat';
import asyncHandler from 'express-async-handler';
import { ExportResponse } from '../shapes/export.js';
import { DestinyVersion } from '../shapes/general.js';
import { ImportResponse } from '../shapes/import.js';
import { ItemAnnotation, ItemHashTag } from '../shapes/item-annotations.js';
import { Loadout } from '../shapes/loadouts.js';
import { defaultSettings, Settings } from '../shapes/settings.js';
import { UserInfo } from '../shapes/user.js';
import { deleteAllDataForUser } from '../stately/bulk-queries.js';
import { client } from '../stately/client.js';
import { AnyItem } from '../stately/generated/index.js';
import { importTags } from '../stately/item-annotations-queries.js';
import { importHashTags } from '../stately/item-hash-tags-queries.js';
import { importLoadouts } from '../stately/loadouts-queries.js';
import { importSearches } from '../stately/searches-queries.js';
import { convertToStatelyItem } from '../stately/settings-queries.js';
import { batches } from '../stately/stately-utils.js';
import { importTriumphs } from '../stately/triumphs-queries.js';
import { badRequest, delay, subtractObject } from '../utils.js';

export const importHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId, profileIds } = req.user as UserInfo;

  // Support only new API exports
  const importData = req.body as ExportResponse;

  const { settings, loadouts, itemAnnotations, triumphs, searches, itemHashTags } =
    extractImportData(importData);

  if (
    isEmpty(settings) &&
    loadouts.length === 0 &&
    itemAnnotations.length === 0 &&
    triumphs.length === 0 &&
    searches.length === 0
  ) {
    badRequest(res, "Won't import empty data");
    return;
  }

  const numTriumphs = await statelyImport(
    bungieMembershipId,
    profileIds,
    settings,
    loadouts,
    itemAnnotations,
    triumphs,
    searches,
    itemHashTags,
  );

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
  // TODO: what we should do, is map all these to items, and then we can just do
  // batch puts, 25 at a time.

  let numTriumphs = 0;
  await deleteAllDataForUser(bungieMembershipId, platformMembershipIds);

  const settingsItem = convertToStatelyItem(
    { ...defaultSettings, ...settings },
    bungieMembershipId,
  );

  // The export will have duplicates because import saved to each profile
  // instead of the one that was exported.
  itemHashTags = uniqBy(itemHashTags, (a) => a.hash);
  searches = uniqBy(searches, (s) => s.search.query);

  const items: AnyItem[] = [];
  items.push(...importLoadouts(loadouts));
  items.push(...importTags(itemAnnotations));
  // TODO: I guess save item hash tags to each platform? I should really
  // refactor the import shape to have hashtags per platform, or merge/unique
  // them.
  for (const platformMembershipId of platformMembershipIds) {
    items.push(...importHashTags(platformMembershipId, itemHashTags));
  }
  if (Array.isArray(triumphs)) {
    for (const triumphData of triumphs) {
      if (Array.isArray(triumphData?.triumphs)) {
        items.push(...importTriumphs(triumphData.platformMembershipId, triumphData.triumphs));
        numTriumphs += triumphData.triumphs.length;
      }
    }
  }
  for (const platformMembershipId of platformMembershipIds) {
    // TODO: I guess save them to each platform? I should really refactor the
    // import shape to have searches per platform, or merge/unique them.
    items.push(...importSearches(platformMembershipId, searches));
  }

  // Put the settings in first since it's in a different group
  await client.put({
    item: settingsItem,
  });
  // OK now put them in as fast as we can
  for (const batch of batches(items)) {
    // We shouldn't have any existing items...
    await client.putBatch(
      ...batch.map((item) => ({ item, mustNotExist: true, overwriteMetadataTimestamps: true })),
    );
    await delay(100); // give it some time to flush
  }

  return numTriumphs;
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
