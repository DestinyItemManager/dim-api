import { keyPath } from '@stately-cloud/client';
import { ItemHashTag, TagValue } from '../shapes/item-annotations.js';
import { client } from './client.js';
import {
  ItemHashTag as StatelyItemHashTag,
  TagValue as StatelyTagValue,
} from './generated/index.js';
import { batches, clearValue, enumToStringUnion } from './stately-utils.js';

export function keyFor(platformMembershipId: string | bigint, itemHash: number) {
  // HashTags are D2-only
  return keyPath`/p-${BigInt(platformMembershipId)}/d-2/iht-${itemHash}`;
}

/**
 * Get all of the hash tags for a particular platform_membership_id and destiny_version.
 */
// TODO: We probably will get these in a big query across all types more often than one type at a time
export async function getItemHashTagsForProfile(
  platformMembershipId: string,
): Promise<ItemHashTag[]> {
  const results: ItemHashTag[] = [];
  const iter = client.beginList(keyPath`/p-${BigInt(platformMembershipId)}/d-2/iht`);
  for await (const item of iter) {
    if (client.isType(item, 'ItemHashTag')) {
      results.push(convertItemHashTag(item));
    }
  }
  return results;
}

export function convertItemHashTag(item: StatelyItemHashTag): ItemHashTag {
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
  itemHashTag: ItemHashTag,
): Promise<void> {
  const tagValue = clearValue(itemHashTag.tag);
  const notesValue = clearValue(itemHashTag.notes);

  if (tagValue === 'clear' && notesValue === 'clear') {
    // Delete the annotation entirely
    return deleteItemHashTag(platformMembershipId, itemHashTag.hash);
  }

  await client.transaction(async (txn) => {
    let existing = await txn.get('ItemHashTag', keyFor(platformMembershipId, itemHashTag.hash));
    if (!existing) {
      existing = client.create('ItemHashTag', {
        hash: itemHashTag.hash,
        profileId: BigInt(platformMembershipId),
        destinyVersion: 2,
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

export function importHashTags(platformMembershipId: string, itemHashTags: ItemHashTag[]) {
  return itemHashTags.map((v) =>
    client.create('ItemHashTag', {
      hash: v.hash,
      profileId: BigInt(platformMembershipId),
      destinyVersion: 2,
      tag: v.tag ? StatelyTagValue[`TagValue_${v.tag}`] : StatelyTagValue.TagValue_UNSPECIFIED,
      notes: v.notes || '',
    }),
  );
}

/**
 * Delete an item hash tags.
 */
export async function deleteItemHashTag(
  platformMembershipId: string,
  ...inventoryItemHashes: number[]
): Promise<void> {
  return client.del(...inventoryItemHashes.map((hash) => keyFor(platformMembershipId, hash)));
}

/**
 * Delete all item hash tags for a user.
 */
export async function deleteAllItemHashTags(platformMembershipId: string): Promise<void> {
  // TODO: this is inefficient, for delete-my-data we'll nuke all the items in the group at once
  const allHashTags = await getItemHashTagsForProfile(platformMembershipId);
  if (!allHashTags.length) {
    return;
  }

  for (const batch of batches(allHashTags)) {
    await client.del(...batch.map((a) => keyFor(platformMembershipId, a.hash)));
  }
}
