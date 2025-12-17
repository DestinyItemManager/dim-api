import { ClientBase, QueryResult } from 'pg';
import { metrics } from '../metrics/index.js';
import { DestinyVersion } from '../shapes/general.js';
import { ItemAnnotation, TagValue } from '../shapes/item-annotations.js';

interface ItemAnnotationRow {
  inventory_item_id: string;
  tag: TagValue | null;
  notes: string | null;
  crafted_date: Date | null;
}

// eslint-disable-next-line no-restricted-syntax
export enum TagValueEnum {
  clear = 0,
  favorite = 1,
  keep = 2,
  infuse = 3,
  junk = 4,
  archive = 5,
}

/**
 * Get all of the item annotations for a particular platform_membership_id and destiny_version.
 */
export async function getItemAnnotationsForProfile(
  client: ClientBase,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
): Promise<ItemAnnotation[]> {
  const results = await client.query<ItemAnnotationRow>({
    name: 'get_item_annotations',
    text: 'SELECT inventory_item_id, tag, notes, variant, crafted_date FROM item_annotations WHERE platform_membership_id = $1 and destiny_version = $2 and deleted_at IS NULL',
    values: [platformMembershipId, destinyVersion],
  });
  return results.rows.map(convertItemAnnotation);
}

/**
 * Get ALL of the item annotations for a particular user across all platforms.
 */
export async function getAllItemAnnotationsForUser(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<
  {
    platformMembershipId: string;
    destinyVersion: DestinyVersion;
    annotation: ItemAnnotation;
  }[]
> {
  // TODO: this isn't indexed!
  const results = await client.query<
    ItemAnnotationRow & { platform_membership_id: string; destiny_version: DestinyVersion }
  >({
    name: 'get_all_item_annotations',
    text: 'SELECT platform_membership_id, destiny_version, inventory_item_id, tag, notes, crafted_date FROM item_annotations WHERE inventory_item_id != 0 and platform_membership_id = $1 and deleted_at IS NULL',
    values: [bungieMembershipId],
  });
  return results.rows.map((row) => ({
    platformMembershipId: row.platform_membership_id,
    destinyVersion: row.destiny_version,
    annotation: convertItemAnnotation(row),
  }));
}

function convertItemAnnotation(row: ItemAnnotationRow): ItemAnnotation {
  const result: ItemAnnotation = {
    id: row.inventory_item_id,
  };
  if (row.tag) {
    result.tag = row.tag;
  }
  if (row.notes) {
    result.notes = row.notes;
  }
  if (row.crafted_date) {
    result.craftedDate = row.crafted_date.getTime() / 1000;
  }
  return result;
}

/**
 * Insert or update (upsert) a single item annotation.
 */
export async function updateItemAnnotation(
  client: ClientBase,
  bungieMembershipId: number,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  itemAnnotation: ItemAnnotation,
): Promise<QueryResult> {
  const tagValue = clearValue(itemAnnotation.tag);
  const notesValue = clearValue(itemAnnotation.notes);

  if (tagValue === 'clear' && notesValue === 'clear') {
    return deleteItemAnnotation(client, platformMembershipId, itemAnnotation.id);
  }
  const response = await client.query({
    name: 'upsert_item_annotation',
    text: `insert INTO item_annotations (membership_id, platform_membership_id, destiny_version, inventory_item_id, tag, notes, crafted_date)
values ($1, $2, $3, $4, (CASE WHEN $5 = 0 THEN NULL ELSE $5 END)::item_tag, (CASE WHEN $6 = 'clear' THEN NULL ELSE $6 END), $7)
on conflict (platform_membership_id, inventory_item_id)
do update set (tag, notes, deleted_at) = ((CASE WHEN $5 = 0 THEN NULL WHEN $5 IS NULL THEN item_annotations.tag ELSE $5 END), (CASE WHEN $6 = 'clear' THEN NULL WHEN $6 IS NULL THEN item_annotations.notes ELSE $6 END), $7, null)`,
    values: [
      bungieMembershipId, // $1
      platformMembershipId, // $2
      destinyVersion, // $3
      itemAnnotation.id, // $4
      tagValue === null ? null : TagValueEnum[tagValue], // $5
      notesValue, // $6
      itemAnnotation.craftedDate ? new Date(itemAnnotation.craftedDate * 1000) : null, // $7
    ],
  });

  if (response.rowCount! < 1) {
    // This should never happen!
    metrics.increment('db.itemAnnotations.noRowUpdated.count', 1);
    throw new Error('tags - No row was updated');
  }

  return response;
}

/**
 * If the value is explicitly set to null or empty string, we return "clear" which will remove the value from the database.
 * If it's undefined we return null, which will preserve the existing value.
 * If it's set, we'll return the input which will update the existing value.
 */
function clearValue<T extends string>(val: T | null | undefined): T | 'clear' | null {
  if (val === null || val?.length === 0) {
    return 'clear';
  } else if (!val) {
    return null;
  } else {
    return val;
  }
}

/**
 * Delete an item annotation.
 */
export async function deleteItemAnnotation(
  client: ClientBase,
  platformMembershipId: string,
  inventoryItemId: string,
): Promise<QueryResult> {
  return client.query({
    name: 'delete_item_annotation',
    text: `update item_annotations set (tag, notes, deleted_at) = (null, null, now()) where platform_membership_id = $1 and inventory_item_id = $2`,
    values: [platformMembershipId, inventoryItemId],
  });
}

/**
 * Delete an list of annotations.
 */
export async function deleteItemAnnotationList(
  client: ClientBase,
  platformMembershipId: string,
  inventoryItemIds: string[],
): Promise<QueryResult> {
  return client.query({
    name: 'delete_item_annotation_list',
    text: `update item_annotations set (tag, notes, deleted_at) = (null, null, now()) where membership_id = $1 and inventory_item_id::bigint = ANY($2::bigint[])`,
    values: [platformMembershipId, inventoryItemIds],
  });
}

/**
 * Delete all item annotations for a user (on all platforms).
 * @deprecated
 */
export async function deleteAllItemAnnotations(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<QueryResult> {
  return client.query({
    name: 'delete_all_item_annotations',
    text: `delete from item_annotations where membership_id = $1`,
    values: [bungieMembershipId],
  });
}
