import { keyPath } from '@stately-cloud/client';
import { ExportResponse } from '../shapes/export.js';
import { DestinyVersion } from '../shapes/general.js';
import { client } from './client.js';
import { AnyItem } from './generated/index.js';
import { convertItemAnnotation, keyFor as tagKeyFor } from './item-annotations-queries.js';
import { convertItemHashTag, keyFor as hashTagKeyFor } from './item-hash-tags-queries.js';
import { convertLoadoutFromStately, keyFor as loadoutKeyFor } from './loadouts-queries.js';
import { convertSearchFromStately, keyFor as searchKeyFor } from './searches-queries.js';
import { getSettings, keyFor as settingsKeyFor } from './settings-queries.js';
import { batches } from './stately-utils.js';
import { keyFor as triumphKeyFor } from './triumphs-queries.js';

/**
 * Delete all the data for a user+profile combo.
 */
export async function deleteAllDataForUser(
  bungieMembershipId: number,
  platformMembershipId: string,
): Promise<void> {
  // TODO: This really calls for a deleteGroup API!

  const prefix = keyPath`/p-${BigInt(platformMembershipId)}`;

  // First, get all the keys we need to delete
  const iter = client.beginList(prefix);
  const keys: string[] = [];
  for await (const item of iter) {
    const key = keyFor(item);
    if (key) {
      keys.push(key);
    }
  }

  // Then delete them all. We're not in a transaction!
  for (const batch of batches(keys)) {
    await client.del(...batch);
  }

  // Also delete settings, which are stored by membershipId
  await client.del(settingsKeyFor(bungieMembershipId));
}

function keyFor(item: AnyItem): string {
  // TODO: This is where we *really* need an item key helper!
  if (client.isType(item, 'Triumph')) {
    return triumphKeyFor(item.profileId, item.recordHash);
  } else if (client.isType(item, 'ItemAnnotation')) {
    return tagKeyFor(item.profileId, item.destinyVersion as DestinyVersion, item.id);
  } else if (client.isType(item, 'ItemHashTag')) {
    return hashTagKeyFor(item.profileId, item.destinyVersion as DestinyVersion, item.hash);
  } else if (client.isType(item, 'Loadout')) {
    return loadoutKeyFor(item.profileId, item.destinyVersion as DestinyVersion, item.id);
  } else if (client.isType(item, 'Search')) {
    return searchKeyFor(item.profileId, item.destinyVersion as DestinyVersion, item.query);
  }
  return '';
}

/**
 * Export all data for a given membership and profile.
 */
export async function exportDataForUser(
  bungieMembershipId: number,
  platformMembershipId: string,
): Promise<ExportResponse> {
  const settingsPromise = getSettings(bungieMembershipId);
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
    settings: await settingsPromise,
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
