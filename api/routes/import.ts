import asyncHandler from 'express-async-handler';
import _ from 'lodash';
import { transaction } from '../db';
import { updateItemAnnotation } from '../db/item-annotations-queries';
import { updateItemHashTag } from '../db/item-hash-tags-queries';
import { updateLoadout } from '../db/loadouts-queries';
import { importSearch } from '../db/searches-queries';
import { replaceSettings } from '../db/settings-queries';
import { trackTriumph } from '../db/triumphs-queries';
import { ExportResponse } from '../shapes/export';
import { DestinyVersion } from '../shapes/general';
import { ImportResponse } from '../shapes/import';
import { ItemAnnotation } from '../shapes/item-annotations';
import { Loadout } from '../shapes/loadouts';
import { defaultSettings, Settings } from '../shapes/settings';
import { badRequest } from '../utils';
import { deleteAllData } from './delete-all-data';

export interface DimData {
  // The last selected platform membership ID
  membershipId?: string;
  destinyVersion?: DestinyVersion;
  // membership IDs of ignored DTR reviewers
  ignoredUsers?: readonly string[];
  // loadout ids
  'loadouts-v3.0'?: readonly string[];
  'settings-v1.0'?: Readonly<Partial<Settings>>; // settings

  // dimItemInfo-m${account.membershipId}-d${account.destinyVersion}
  // [`info.${id}`]
  [key: string]: any;
}

export const importHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId } = req.user!;
  const { id: appId } = req.dimApp!;

  // Support both old DIM exports and new API exports
  const importData = req.body as DimData | ExportResponse;

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
        loadout
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
        annotation
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
              triumph
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
        search.search.usageCount
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

function extractSettings(importData: DimData | ExportResponse): Settings {
  return subtractObject(
    importData.settings || importData['settings-v1.0'],
    defaultSettings
  ) as Settings;
}

type PlatformLoadout = Loadout & {
  platformMembershipId: string;
  destinyVersion: DestinyVersion;
};

function extractLoadouts(importData: DimData | ExportResponse): PlatformLoadout[] {
  if (importData.loadouts) {
    return importData.loadouts.map((l) => ({
      ...l.loadout,
      platformMembershipId: l.platformMembershipId,
      destinyVersion: l.destinyVersion,
    }));
  }

  const ids = importData['loadouts-v3.0'];
  if (!ids) {
    return [];
  }
  return ids
    .map((id) => importData[id])
    .filter(Boolean)
    .map((rawLoadout) => ({
      platformMembershipId: rawLoadout.membershipId,
      destinyVersion: rawLoadout.destinyVersion,
      id: rawLoadout.id,
      name: rawLoadout.name,
      classType: convertLoadoutClassType(rawLoadout.classType),
      clearSpace: rawLoadout.clearSpace || false,
      equipped: rawLoadout.items
        .filter((i) => i.equipped)
        .map((item) => ({ id: item.id, hash: item.hash, amount: item.amount })),
      unequipped: rawLoadout.items
        .filter((i) => !i.equipped)
        .map((item) => ({ id: item.id, hash: item.hash, amount: item.amount })),
    }));
}

/** Legacy loadout class assignment */
export enum LoadoutClass {
  any = -1,
  warlock = 0,
  titan = 1,
  hunter = 2,
}

export const loadoutClassToClassType = {
  [LoadoutClass.hunter]: 1,
  [LoadoutClass.titan]: 0,
  [LoadoutClass.warlock]: 2,
  [LoadoutClass.any]: 3,
};

export const classTypeToLoadoutClass = {
  1: LoadoutClass.hunter,
  0: LoadoutClass.titan,
  2: LoadoutClass.warlock,
  3: LoadoutClass.any,
};

function convertLoadoutClassType(loadoutClassType: LoadoutClass) {
  return loadoutClassToClassType[loadoutClassType ?? LoadoutClass.any];
}

type PlatformItemAnnotation = ItemAnnotation & {
  platformMembershipId: string;
  destinyVersion: DestinyVersion;
};

function extractItemAnnotations(importData: DimData | ExportResponse): PlatformItemAnnotation[] {
  if (importData.tags) {
    return importData.tags.map((t) => ({
      ...t.annotation,
      platformMembershipId: t.platformMembershipId,
      destinyVersion: t.destinyVersion || 2,
    }));
  }

  const annotations: PlatformItemAnnotation[] = [];
  for (const key in importData) {
    const match = /^dimItemInfo-m(\d+)-d(1|2)$/.exec(key);
    if (match) {
      const platformMembershipId = match[1];
      const destinyVersion = parseInt(match[2], 10) as DestinyVersion;
      for (const id in importData[key]) {
        const value = importData[key][id];
        annotations.push({
          platformMembershipId,
          destinyVersion,
          id,
          tag: value.tag,
          notes: value.notes,
        });
      }
    }
  }
  return annotations;
}

function extractSearches(importData: ExportResponse | DimData): ExportResponse['searches'] {
  return (importData.searches || []).filter(
    // Filter out pre-filled searches that were never used
    (s) => s.search.usageCount > 0
  );
}
