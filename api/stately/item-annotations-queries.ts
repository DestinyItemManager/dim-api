import { keyPath } from '@stately-cloud/client';
import { DestinyVersion } from '../shapes/general.js';
import { ItemAnnotation, TagValue } from '../shapes/item-annotations.js';
import { client } from './client.js';
import {
  ItemAnnotation as StatelyItemAnnotation,
  TagValue as StatelyTagValue,
} from './generated/index.js';
import { batches, clearValue, enumToStringUnion } from './stately-utils.js';

export function keyFor(
  platformMembershipId: string | bigint,
  destinyVersion: DestinyVersion,
  inventoryItemId: string | bigint,
) {
  return keyPath`/p-${BigInt(platformMembershipId)}/d-${destinyVersion}/ia-${BigInt(inventoryItemId)}`;
}

/**
 * Get all of the item annotations for a particular platform_membership_id and destiny_version.
 */
// TODO: We probably will get these in a big query across all types more often than one type at a time
export async function getItemAnnotationsForProfile(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
): Promise<ItemAnnotation[]> {
  const results: ItemAnnotation[] = [];
  const iter = client.beginList(keyPath`/p-${BigInt(platformMembershipId)}/d-${destinyVersion}/ia`);
  for await (const item of iter) {
    if (client.isType(item, 'ItemAnnotation')) {
      results.push(convertItemAnnotation(item));
    }
  }
  return results;
}

/**
 * Get ALL of the item annotations for a particular platformMembershipId, across
 * all Destiny versions. This is a bit different from the PG version which gets
 * everything under a bungieMembershipId.
 */
export async function getAllItemAnnotationsForUser(platformMembershipId: string): Promise<
  {
    platformMembershipId: string;
    destinyVersion: DestinyVersion;
    annotation: ItemAnnotation;
  }[]
> {
  // Rather than list ALL items under the profile and filter down to item
  // annotations, just separately get the D1 and D2 tags. We probably won't use
  // this - for export we *will* scrape a whole profile.
  const d1Annotations = getItemAnnotationsForProfile(platformMembershipId, 1);
  const d2Annotations = getItemAnnotationsForProfile(platformMembershipId, 2);
  return (await d1Annotations)
    .map((a) => ({ platformMembershipId, destinyVersion: 1 as DestinyVersion, annotation: a }))
    .concat(
      (await d2Annotations).map((a) => ({
        platformMembershipId,
        destinyVersion: 2 as DestinyVersion,
        annotation: a,
      })),
    );
}

export function convertItemAnnotation(item: StatelyItemAnnotation): ItemAnnotation {
  const result: ItemAnnotation = {
    id: item.id.toString(),
  };
  if (item.tag) {
    result.tag = enumToStringUnion(StatelyTagValue, item.tag) as TagValue;
  }
  if (item.notes) {
    result.notes = item.notes;
  }
  if (item.craftedDate) {
    result.craftedDate = Number(item.craftedDate) / 1000;
  }
  // TODO: I took Variant back out...
  return result;
}

/**
 * Insert or update (upsert) a single item annotation.
 */
export async function updateItemAnnotation(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  itemAnnotation: ItemAnnotation,
): Promise<void> {
  const tagValue = clearValue(itemAnnotation.tag);
  const notesValue = clearValue(itemAnnotation.notes);

  if (tagValue === 'clear' && notesValue === 'clear') {
    // Delete the annotation entirely
    return deleteItemAnnotation(platformMembershipId, destinyVersion, itemAnnotation.id);
  }

  await client.transaction(async (txn) => {
    let existing = await txn.get(
      'ItemAnnotation',
      keyFor(platformMembershipId, destinyVersion, itemAnnotation.id),
    );
    if (!existing) {
      existing = client.create('ItemAnnotation', {
        id: BigInt(itemAnnotation.id),
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

    if (itemAnnotation.craftedDate) {
      existing.craftedDate = BigInt(itemAnnotation.craftedDate * 1000);
    }

    await txn.put(existing);
  });
}

export function importTags(
  itemAnnotations: (ItemAnnotation & {
    platformMembershipId: string;
    destinyVersion: DestinyVersion;
  })[],
) {
  return itemAnnotations.map((v) =>
    client.create('ItemAnnotation', {
      id: BigInt(v.id),
      profileId: BigInt(v.platformMembershipId),
      destinyVersion: v.destinyVersion,
      tag: v.tag ? StatelyTagValue[`TagValue_${v.tag}`] : StatelyTagValue.TagValue_UNSPECIFIED,
      notes: v.notes || '',
      craftedDate: v.craftedDate ? BigInt(v.craftedDate * 1000) : undefined,
    }),
  );
}

/**
 * Delete an item annotation.
 */
export async function deleteItemAnnotation(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  ...inventoryItemIds: string[]
): Promise<void> {
  return client.del(
    ...inventoryItemIds.map((id) => keyFor(platformMembershipId, destinyVersion, id)),
  );
}

/**
 * Delete all item annotations for a user (on all platforms).
 */
export async function deleteAllItemAnnotations(platformMembershipId: string): Promise<void> {
  // TODO: this is inefficient, for delete-my-data we'll nuke all the items in the group at once
  const allAnnotations = await getAllItemAnnotationsForUser(platformMembershipId);
  if (!allAnnotations.length) {
    return;
  }
  for (const batch of batches(allAnnotations)) {
    await client.del(
      ...batch.map((a) => keyFor(a.platformMembershipId, a.destinyVersion, a.annotation.id)),
    );
  }
}
