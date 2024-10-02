import { keyPath } from '@stately-cloud/client';
import { DeleteAllResponse } from '../shapes/delete-all.js';
import { ExportResponse } from '../shapes/export.js';
import { DestinyVersion } from '../shapes/general.js';
import { ProfileResponse } from '../shapes/profile.js';
import { defaultSettings } from '../shapes/settings.js';
import { subtractObject } from '../utils.js';
import { client } from './client.js';
import { AnyItem } from './generated/index.js';
import { convertItemAnnotation, keyFor as tagKeyFor } from './item-annotations-queries.js';
import { convertItemHashTag, keyFor as hashTagKeyFor } from './item-hash-tags-queries.js';
import { convertLoadoutFromStately, keyFor as loadoutKeyFor } from './loadouts-queries.js';
import { convertSearchFromStately, keyFor as searchKeyFor } from './searches-queries.js';
import { deleteSettings, getSettings } from './settings-queries.js';
import { batches } from './stately-utils.js';
import { keyFor as triumphKeyFor } from './triumphs-queries.js';

/**
 * Delete all the data for a user+profile combo.
 */
export async function deleteAllDataForUser(
  bungieMembershipId: number,
  platformMembershipIds: string[],
): Promise<DeleteAllResponse['deleted']> {
  const responses = await Promise.all(platformMembershipIds.map((p) => deleteAllDataForProfile(p)));

  // Also delete settings, which are stored by membershipId
  await deleteSettings(bungieMembershipId);

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

/**
 * Export all data for a given membership and profile.
 */
export async function exportDataForUser(
  bungieMembershipId: number,
  platformMembershipIds: string[],
): Promise<ExportResponse> {
  const settingsPromise = getSettings(bungieMembershipId);
  const responses = await Promise.all(platformMembershipIds.map((p) => exportDataForProfile(p)));

  const settings = await settingsPromise;
  const initialResponse: ExportResponse = {
    settings: subtractObject(settings, defaultSettings),
    loadouts: [],
    tags: [],
    itemHashTags: [],
    triumphs: [],
    searches: [],
  };

  return responses.reduce<ExportResponse>((acc, r) => {
    acc.loadouts.push(...r.loadouts);
    acc.tags.push(...r.tags);
    acc.itemHashTags.push(...r.itemHashTags);
    acc.triumphs.push(...r.triumphs);
    acc.searches.push(...r.searches);
    return acc;
  }, initialResponse);
}

async function exportDataForProfile(platformMembershipId: string): Promise<ExportResponse> {
  const prefix = keyPath`/p-${BigInt(platformMembershipId)}`;

  const loadouts: ExportResponse['loadouts'] = [];
  const itemAnnotations: ExportResponse['tags'] = [];
  const itemHashTags: ExportResponse['itemHashTags'] = [];
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
      itemHashTags.push(convertItemHashTag(item));
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
): Promise<ProfileResponse> {
  const prefix = keyPath`/p-${BigInt(platformMembershipId)}/d-${destinyVersion}`;

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

  return response;
}
