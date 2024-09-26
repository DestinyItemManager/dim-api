import { keyPath } from '@stately-cloud/client';
import { DestinyVersion } from '../shapes/general.js';
import { ItemHashTag, TagValue } from '../shapes/item-annotations.js';
import { client } from './client.js';
import {
  ItemHashTag as StatelyItemHashTag,
  TagValue as StatelyTagValue,
} from './generated/index.js';
import { clearValue, enumToStringUnion } from './stately-utils.js';

function keyFor(platformMembershipId: string, destinyVersion: DestinyVersion, itemHash: number) {
  return keyPath`/p-${BigInt(platformMembershipId)}/d-${destinyVersion}/iht-${itemHash}`;
}

/**
 * Get all of the hash tags for a particular platform_membership_id and destiny_version.
 */
// TODO: We probably will get these in a big query across all types more often than one type at a time
export async function getItemHashTagsForProfile(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
): Promise<ItemHashTag[]> {
  const results: ItemHashTag[] = [];
  const iter = client.beginList(
    keyPath`/p-${BigInt(platformMembershipId)}/d-${destinyVersion}/iht`,
  );
  for await (const item of iter) {
    if (client.isType(item, 'ItemHashTag')) {
      results.push(convertItemHashTag(item));
    }
  }
  return results;
}

function convertItemHashTag(item: StatelyItemHashTag): ItemHashTag {
  const result: ItemHashTag = {
    hash: Number(item.hash),
  };
  if (item.tag) {
    result.tag = enumToStringUnion(StatelyTagValue, item.tag) as TagValue;
  }
  if (item.notes) {
    result.notes = item.notes;
  }
  return result;
}

/**
 * Insert or update (upsert) a single item annotation.
 */
export async function updateItemHashTag(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  itemHashTag: ItemHashTag,
): Promise<void> {
  const tagValue = clearValue(itemHashTag.tag);
  const notesValue = clearValue(itemHashTag.notes);

  if (tagValue === 'clear' && notesValue === 'clear') {
    // Delete the annotation entirely
    return deleteItemHashTag(platformMembershipId, destinyVersion, itemHashTag.hash);
  }

  await client.transaction(async (txn) => {
    let existing = await txn.get(
      'ItemHashTag',
      keyFor(platformMembershipId, destinyVersion, itemHashTag.hash),
    );
    if (!existing) {
      existing = client.create('ItemHashTag', {
        hash: itemHashTag.hash,
        profileId: BigInt(platformMembershipId),
        destinyVersion,
      });
    }

    if (tagValue === 'clear') {
      existing.tag = StatelyTagValue.TagValue_UNSPECIFIED;
    } else if (tagValue !== null) {
      existing.tag = StatelyTagValue[`TagValue_${tagValue}`];
    }

    if (notesValue === 'clear') {
      existing.notes = '';
    } else if (notesValue !== null) {
      existing.notes = notesValue;
    }

    await txn.put(existing);
  });
}

/**
 * Delete an item hash tags.
 */
export async function deleteItemHashTag(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  ...inventoryItemHashes: number[]
): Promise<void> {
  return client.del(
    ...inventoryItemHashes.map((hash) => keyFor(platformMembershipId, destinyVersion, hash)),
  );
}

/**
 * Delete all item hash tags for a user.
 */
export async function deleteAllItemHashTags(platformMembershipId: string): Promise<void> {
  // TODO: this is inefficient, for delete-my-data we'll nuke all the items in the group at once
  const allHashTags = await getAllItemHashTagsForUser(platformMembershipId);
  if (!allHashTags.length) {
    return;
  }
  return client.del(
    ...allHashTags.map((a) => keyFor(a.platformMembershipId, a.destinyVersion, a.hashTag.hash)),
  );
}

/**
 * Get ALL of the item hash tags for a particular platformMembershipId, across
 * all Destiny versions. This is a bit different from the PG version which gets
 * everything under a bungieMembershipId.
 */
export async function getAllItemHashTagsForUser(platformMembershipId: string): Promise<
  {
    platformMembershipId: string;
    destinyVersion: DestinyVersion;
    hashTag: ItemHashTag;
  }[]
> {
  // Rather than list ALL items under the profile and filter down to item
  // annotations, just separately get the D1 and D2 tags. We probably won't use
  // this - for export we *will* scrape a whole profile.
  const d1Annotations = getItemHashTagsForProfile(platformMembershipId, 1);
  const d2Annotations = getItemHashTagsForProfile(platformMembershipId, 2);
  return (await d1Annotations)
    .map((a) => ({ platformMembershipId, destinyVersion: 1 as DestinyVersion, hashTag: a }))
    .concat(
      (await d2Annotations).map((a) => ({
        platformMembershipId,
        destinyVersion: 2 as DestinyVersion,
        hashTag: a,
      })),
    );
}
