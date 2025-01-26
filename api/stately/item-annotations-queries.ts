import { keyPath, ListToken } from '@stately-cloud/client';
import { partition } from 'es-toolkit';
import { DestinyVersion } from '../shapes/general.js';
import { ItemAnnotation, TagValue } from '../shapes/item-annotations.js';
import { getProfile } from './bulk-queries.js';
import { client } from './client.js';
import {
  ItemAnnotation as StatelyItemAnnotation,
  TagValue as StatelyTagValue,
} from './generated/index.js';
import { batches, clearValue, enumToStringUnion, Transaction } from './stately-utils.js';

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
export async function getItemAnnotationsForProfile(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
): Promise<{ tags: ItemAnnotation[]; token: ListToken; deletedTagsIds?: string[] }> {
  const { profile, token } = await getProfile(platformMembershipId, destinyVersion, '/ia');
  return { tags: profile.tags ?? [], token };
}

/**
 * Get ALL of the item annotations for a particular platformMembershipId, across
 * all Destiny versions. This is a bit different from the PG version which gets
 * everything under a bungieMembershipId.
 */
async function getAllItemAnnotationsForUser(platformMembershipId: string): Promise<
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
  return (await d1Annotations).tags
    .map((a) => ({ platformMembershipId, destinyVersion: 1 as DestinyVersion, annotation: a }))
    .concat(
      (await d2Annotations).tags.map((a) => ({
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
 * Insert or update (upsert) item annotations.
 */
export async function updateItemAnnotation(
  txn: Transaction,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  itemAnnotations: ItemAnnotation[],
): Promise<void> {
  interface DelInstr {
    type: 'delete';
    key: string;
  }
  interface PutInstr {
    type: 'put';
    itemAnnotation: ItemAnnotation;
    tagValue: TagValue | 'clear' | null;
    notesValue: string | null;
  }

  const [deletes, puts] = partition(
    itemAnnotations.map((itemAnnotation): DelInstr | PutInstr => {
      const tagValue = clearValue(itemAnnotation.tag);
      const notesValue = clearValue(itemAnnotation.notes);

      if (tagValue === 'clear' && notesValue === 'clear') {
        return {
          type: 'delete',
          key: keyFor(platformMembershipId, destinyVersion, itemAnnotation.id),
        };
      }

      return {
        type: 'put',
        itemAnnotation,
        tagValue,
        notesValue,
      };
    }),
    (v) => v.type === 'delete',
  ) as [DelInstr[], PutInstr[]];

  if (deletes.length) {
    await txn.del(...deletes.map((v) => v.key));
  }

  if (!puts.length) {
    return;
  }

  // We want to merge the incoming values with the existing values, so we need
  // to read the existing values first.
  const existingTags = (
    await txn.getBatch(
      ...puts.map((v) => keyFor(platformMembershipId, destinyVersion, v.itemAnnotation.id)),
    )
  ).filter((i) => client.isType(i, 'ItemAnnotation'));
  const itemsToPut = puts.map(({ itemAnnotation, tagValue, notesValue }) => {
    const idBigInt = BigInt(itemAnnotation.id);
    const ia =
      existingTags.find((t) => t.id === idBigInt) ??
      client.create('ItemAnnotation', {
        id: idBigInt,
        profileId: BigInt(platformMembershipId),
        destinyVersion,
      });

    if (tagValue === 'clear') {
      ia.tag = StatelyTagValue.TagValue_UNSPECIFIED;
    } else if (tagValue !== null) {
      ia.tag = StatelyTagValue[`TagValue_${tagValue}`];
    }

    if (notesValue === 'clear') {
      ia.notes = '';
    } else if (notesValue !== null) {
      ia.notes = notesValue;
    }

    if (itemAnnotation.craftedDate) {
      ia.craftedDate = BigInt(itemAnnotation.craftedDate * 1000);
    }
    return ia;
  });
  await txn.putBatch(...itemsToPut);
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
 * Delete item annotations.
 */
export async function deleteItemAnnotation(
  txn: Transaction,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  inventoryItemIds: string[],
): Promise<void> {
  await txn.del(...inventoryItemIds.map((id) => keyFor(platformMembershipId, destinyVersion, id)));
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
