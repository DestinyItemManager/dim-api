import asyncHandler from 'express-async-handler';
import { getUser } from '../utils';
import { Settings, defaultSettings } from '../shapes/settings';
import { transaction } from '../db';
import { Loadout } from '../shapes/loadouts';
import { ItemAnnotation } from '../shapes/item-annotations';
import { replaceSettings } from '../db/settings-queries';
import { updateLoadout } from '../db/loadouts-queries';
import { updateItemAnnotation } from '../db/item-annotations-queries';
import { deleteAllData } from './delete-all-data';

// in a transaction:
// 1. query all tags/loadouts (at least IDs)
// 2. insert/upsert all items from imported file
// 3. delete things not in imported file

// TODO: new and old import formats (start with old)
// TODO: backup! should it have a special set of indexes or just deal with occasional table scans?

export interface DimData {
  // The last selected platform membership ID
  membershipId?: string;
  destinyVersion?: 1 | 2;
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
  const user = getUser(req);

  const importData = req.body as DimData;

  const settings = extractSettings(importData);
  const loadouts = extractLoadouts(importData);
  const itemAnnotations = extractItemAnnotations(importData);

  await transaction(async (client) => {
    await deleteAllData(client, user);

    // TODO: pass a list of keys that are being set to default?
    await replaceSettings(
      client,
      user.appId,
      user.bungieMembershipId,
      settings
    );

    // TODO: query first so we can delete after?
    for (const loadout of loadouts) {
      // For now, ignore ancient loadouts
      if (!loadout.platformMembershipId || !loadout.destinyVersion) {
        continue;
      }
      await updateLoadout(
        client,
        user.appId,
        user.bungieMembershipId,
        loadout.platformMembershipId,
        loadout.destinyVersion,
        loadout
      );
    }

    // TODO: query first so we can delete after?
    for (const annotation of itemAnnotations) {
      await updateItemAnnotation(
        client,
        user.appId,
        user.bungieMembershipId,
        annotation.platformMembershipId,
        annotation.destinyVersion,
        annotation
      );
    }
  });

  // default 200 OK
  res.status(200).send({});
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

function extractSettings(importData: DimData): Settings {
  return subtractObject(
    importData['settings-v1.0'],
    defaultSettings
  ) as Settings;
}

type PlatformLoadout = Loadout & {
  platformMembershipId: string;
  destinyVersion: 1 | 2;
};

function extractLoadouts(importData: DimData): PlatformLoadout[] {
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
        .map((item) => ({ id: item.id, hash: item.hash, amount: item.amount }))
    }));
}

export enum LoadoutClass {
  any = -1,
  warlock = 0,
  titan = 1,
  hunter = 2
}

export const loadoutClassToClassType = {
  [LoadoutClass.hunter]: 1,
  [LoadoutClass.titan]: 0,
  [LoadoutClass.warlock]: 2,
  [LoadoutClass.any]: 3
};

export const classTypeToLoadoutClass = {
  1: LoadoutClass.hunter,
  0: LoadoutClass.titan,
  2: LoadoutClass.warlock,
  3: LoadoutClass.any
};

function convertLoadoutClassType(loadoutClassType: LoadoutClass) {
  return loadoutClassToClassType[loadoutClassType ?? LoadoutClass.any];
}

type PlatformItemAnnotation = ItemAnnotation & {
  platformMembershipId: string;
  destinyVersion: 1 | 2;
};

function extractItemAnnotations(importData: DimData): PlatformItemAnnotation[] {
  const annotations: PlatformItemAnnotation[] = [];
  for (const key in importData) {
    const match = /dimItemInfo-m(\d+)-d(1|2)/.exec(key);
    if (match) {
      const platformMembershipId = match[1];
      const destinyVersion = parseInt(match[2], 10) as 1 | 2;
      for (const id in importData[key]) {
        const value = importData[key][id];
        annotations.push({
          platformMembershipId,
          destinyVersion,
          id,
          tag: value.tag,
          notes: value.notes
        });
      }
    }
  }
  return annotations;
}
