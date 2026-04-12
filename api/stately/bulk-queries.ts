import { captureMessage } from '@sentry/node';
import { keyPath, ListToken } from '@stately-cloud/client';
import { uniqBy } from 'es-toolkit';
import { transaction } from '../db/index.js';
import { replaceSettings } from '../db/settings-queries.js';
import { DeleteAllResponse } from '../shapes/delete-all.js';
import { ExportResponse } from '../shapes/export.js';
import { DestinyVersion } from '../shapes/general.js';
import { ItemAnnotation, ItemHashTag } from '../shapes/item-annotations.js';
import { Loadout } from '../shapes/loadouts.js';
import { ProfileResponse } from '../shapes/profile.js';
import { Settings } from '../shapes/settings.js';
import { delay } from '../utils.js';
import { client } from './client.js';
import { AnyItem } from './generated/index.js';
import {
  convertItemAnnotation,
  importTags,
  keyFor as tagKeyFor,
} from './item-annotations-queries.js';
import {
  convertItemHashTag,
  keyFor as hashTagKeyFor,
  importHashTags,
} from './item-hash-tags-queries.js';
import {
  convertLoadoutFromStately,
  importLoadouts,
  keyFor as loadoutKeyFor,
} from './loadouts-queries.js';
import {
  convertSearchFromStately,
  importSearches,
  keyFor as searchKeyFor,
} from './searches-queries.js';
import { deleteSettings as deleteSettingsInStately } from './settings-queries.js';
import { batches, fromStatelyUUID, parseKeyPath } from './stately-utils.js';
import { importTriumphs, keyFor as triumphKeyFor } from './triumphs-queries.js';

type PlatformLoadout = Loadout & {
  platformMembershipId: string;
  destinyVersion: DestinyVersion;
};

type PlatformItemAnnotation = ItemAnnotation & {
  platformMembershipId: string;
  destinyVersion: DestinyVersion;
};

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

  // Settings live in Postgres now
  await transaction(async (client) => replaceSettings(client, bungieMembershipId, settings));

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

/**
 * Delete all the data for a user+profile combo.
 */
export async function deleteAllDataForUser(
  bungieMembershipId: number,
  platformMembershipIds: string[],
): Promise<DeleteAllResponse['deleted']> {
  const responses = await Promise.all(platformMembershipIds.map((p) => deleteAllDataForProfile(p)));

  // Also delete settings, which are stored by membershipId
  await deleteSettingsInStately(bungieMembershipId);

  const response = responses.reduce<DeleteAllResponse['deleted']>(
    (acc, r) => {
      for (const key in r) {
        (acc as Record<string, number>)[key] += (r as Record<string, number>)[key];
      }
      return acc;
    },
    {
      settings: 1,
      loadouts: 0,
      tags: 0,
      itemHashTags: 0,
      triumphs: 0,
      searches: 0,
    },
  );

  return response;
}

async function deleteAllDataForProfile(
  platformMembershipId: string,
): Promise<DeleteAllResponse['deleted']> {
  const response: DeleteAllResponse['deleted'] = {
    settings: 0,
    loadouts: 0,
    tags: 0,
    itemHashTags: 0,
    triumphs: 0,
    searches: 0,
  };

  // TODO: This really calls for a deleteGroup API!
  const prefix = keyPath`/p-${BigInt(platformMembershipId)}`;

  // First, get all the keys we need to delete
  const iter = client.beginList(prefix);
  const keys: string[] = [];
  for await (const item of iter) {
    const [key, responseKey] = keyFor(item);
    if (key) {
      response[responseKey] += 1;
      keys.push(key);
    }
  }

  // Then delete them all. We're not in a transaction!
  for (const batch of batches(keys)) {
    await client.del(...batch);
    await delay(100); // give it some time to flush
  }
  return response;
}

function keyFor(item: AnyItem): [keyPath: string, responseKey: keyof DeleteAllResponse['deleted']] {
  // TODO: This is where we *really* need an item key helper!
  if (client.isType(item, 'Triumph')) {
    return [triumphKeyFor(item.profileId, item.recordHash), 'triumphs'];
  } else if (client.isType(item, 'ItemAnnotation')) {
    return [tagKeyFor(item.profileId, item.destinyVersion as DestinyVersion, item.id), 'tags'];
  } else if (client.isType(item, 'ItemHashTag')) {
    return [hashTagKeyFor(item.profileId, item.hash), 'itemHashTags'];
  } else if (client.isType(item, 'Loadout')) {
    return [
      loadoutKeyFor(item.profileId, item.destinyVersion as DestinyVersion, item.id),
      'loadouts',
    ];
  } else if (client.isType(item, 'Search')) {
    return [
      searchKeyFor(item.profileId, item.destinyVersion as DestinyVersion, item.query),
      'searches',
    ];
  }
  return ['', 'settings'];
}

export async function exportDataForProfile(platformMembershipId: string): Promise<ExportResponse> {
  const prefix = keyPath`/p-${BigInt(platformMembershipId)}`;

  const loadouts: ExportResponse['loadouts'] = [];
  const itemAnnotations: ExportResponse['tags'] = [];
  const itemHashTags: {
    platformMembershipId: string;
    itemHashTag: ItemHashTag;
  }[] = [];
  const searches: ExportResponse['searches'] = [];
  const triumphs: number[] = [];

  // Now get all the data under the profile in one listing.
  const iter = client.beginList(prefix);
  for await (const item of iter) {
    if (client.isType(item, 'Triumph')) {
      triumphs.push(item.recordHash);
    } else if (client.isType(item, 'ItemAnnotation')) {
      itemAnnotations.push({
        platformMembershipId,
        destinyVersion: item.destinyVersion as DestinyVersion,
        annotation: convertItemAnnotation(item),
      });
    } else if (client.isType(item, 'ItemHashTag')) {
      itemHashTags.push({
        platformMembershipId,
        itemHashTag: convertItemHashTag(item),
      });
    } else if (client.isType(item, 'Loadout')) {
      loadouts.push({
        platformMembershipId,
        destinyVersion: item.destinyVersion as DestinyVersion,
        loadout: convertLoadoutFromStately(item),
      });
    } else if (client.isType(item, 'Search')) {
      searches.push({
        destinyVersion: item.destinyVersion as DestinyVersion,
        search: convertSearchFromStately(item),
      });
    }
  }

  return {
    settings: {},
    loadouts,
    tags: itemAnnotations,
    itemHashTags,
    triumphs: triumphs.length
      ? [
          {
            platformMembershipId,
            triumphs,
          },
        ]
      : [],
    searches,
  };
}

export async function getProfile(
  platformMembershipId: string | bigint,
  destinyVersion: DestinyVersion,
  suffix: string,
): Promise<{ profile: ProfileResponse; token: ListToken }> {
  const prefix = keyPath`/p-${BigInt(platformMembershipId)}/d-${destinyVersion}` + suffix;

  const response: ProfileResponse = {};

  // Now get all the data under the profile in one listing.
  const iter = client.beginList(prefix);
  for await (const item of iter) {
    if (client.isType(item, 'Triumph')) {
      (response.triumphs ??= []).push(item.recordHash);
    } else if (client.isType(item, 'ItemAnnotation')) {
      (response.tags ??= []).push(convertItemAnnotation(item));
    } else if (client.isType(item, 'ItemHashTag')) {
      (response.itemHashTags ??= []).push(convertItemHashTag(item));
    } else if (client.isType(item, 'Loadout')) {
      (response.loadouts ??= []).push(convertLoadoutFromStately(item));
    } else if (client.isType(item, 'Search')) {
      (response.searches ??= []).push(convertSearchFromStately(item));
    }
  }

  return { profile: response, token: iter.token! };
}

export async function syncProfile(
  tokenData: Buffer,
): Promise<{ profile: ProfileResponse; token: ListToken }> {
  const response: ProfileResponse = {
    sync: true,
  };

  // Now get all the data under the profile in one listing.
  const iter = client.syncList(tokenData);
  for await (const change of iter) {
    switch (change.type) {
      case 'reset': {
        response.sync = false;
        break;
      }
      case 'changed': {
        const item = change.item;
        if (client.isType(item, 'Triumph')) {
          (response.triumphs ??= []).push(item.recordHash);
        } else if (client.isType(item, 'ItemAnnotation')) {
          (response.tags ??= []).push(convertItemAnnotation(item));
        } else if (client.isType(item, 'ItemHashTag')) {
          (response.itemHashTags ??= []).push(convertItemHashTag(item));
        } else if (client.isType(item, 'Loadout')) {
          (response.loadouts ??= []).push(convertLoadoutFromStately(item));
        } else if (client.isType(item, 'Search')) {
          (response.searches ??= []).push(convertSearchFromStately(item));
        }
        break;
      }
      case 'deleted': {
        const keyPath = parseKeyPath(change.keyPath);
        if (keyPath[0].ns === 'p') {
          const lastPart = keyPath.at(-1)!;
          const idStr = lastPart.id;
          const type = lastPart.ns;
          switch (type) {
            case 'triumph': {
              (response.deletedTriumphs ??= []).push(Number(idStr));
              break;
            }
            case 'ia': {
              (response.deletedTagsIds ??= []).push(idStr);
              break;
            }
            case 'iht': {
              (response.deletedItemHashTagHashes ??= []).push(Number(idStr));
              break;
            }
            case 'loadout': {
              (response.deletedLoadoutIds ??= []).push(fromStatelyUUID(idStr));
              break;
            }
            case 'search': {
              (response.deletedSearchHashes ??= []).push(idStr);
              break;
            }
            default:
              captureMessage(`Unknown deleted type ${type}`);
              break;
          }
        } else {
          captureMessage(`Unknown deleted keyPath ${change.keyPath}`);
        }
        break;
      }
      case 'updatedOutsideWindow': {
        captureMessage(`Unexpected updatedOutsideWindow ${change.keyPath}`);
        break;
      }
    }
  }

  return { profile: response, token: iter.token! };
}
