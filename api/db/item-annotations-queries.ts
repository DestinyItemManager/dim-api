import { ClientBase, QueryResult } from 'pg';
import { ItemAnnotation } from '../shapes/item-annotations';
import { camelize } from '../utils';

/**
 * Get all of the item annotations for a particular platform_membership_id and destiny_version.
 */
export async function getItemAnnotations(
  client: ClientBase,
  platformMembershipId: number,
  destinyVersion: 1 | 2
): Promise<ItemAnnotation[]> {
  const results = await client.query({
    name: 'get_item_annotations',
    text:
      'SELECT inventory_item_id, tag, notes FROM item_annotations WHERE platform_membership_id = $1 and destiny_version = $2',
    values: [platformMembershipId, destinyVersion]
  });
  return results.rows.map((row) => ({
    id: row.inventory_item_id,
    tag: row.tag,
    notes: row.notes
  }));
}

/**
 * Get all of the item annotations for a particular user across all platforms.
 */
export async function getAllItemAnnotationsForUser(
  client: ClientBase,
  bungieMembershipId: number
): Promise<ItemAnnotation[]> {
  const results = await client.query({
    name: 'get_item_annotations',
    text:
      'SELECT membership_id, platform_membership_id, destiny_version, inventory_item_id, tag, notes FROM item_annotations WHERE membership_id = $1',
    values: [bungieMembershipId]
  });
  return results.rows.map((row) => camelize(row));
}

/**
 * Insert or update (upsert) a single item annotation. Loadouts are totally replaced when updated.
 */
export async function updateItemAnnotation(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  platformMembershipId: string,
  destinyVersion: 1 | 2,
  itemAnnotation: ItemAnnotation
): Promise<QueryResult<any>> {
  // TODO: if both are null, issue a delete? or just tombstone them?
  if (itemAnnotation.notes === null && itemAnnotation.tag === null) {
    return deleteItemAnnotation(client, itemAnnotation.id);
  }

  return client.query({
    name: 'upsert_item_annotation',
    text: `insert INTO item_annotations (membership_id, platform_membership_id, destiny_version, inventory_item_id, tag, notes, created_by, last_updated_by)
values ($1, $2, $3, $4, $5, $6, $7, $7)
on conflict (inventory_item_id)
do update set (tag, notes, last_updated_at, last_updated_by) = ((CASE WHEN $5 = 'clear' THEN NULL WHEN $5 = null THEN item_annotations.tag ELSE $5 END), (CASE WHEN $6 = 'clear' THEN NULL WHEN $6 = null THEN item_annotations.notes ELSE $6 END), current_timestamp, $7)`,
    values: [
      bungieMembershipId,
      platformMembershipId,
      destinyVersion,
      itemAnnotation.id,
      clearValue(itemAnnotation.tag),
      clearValue(itemAnnotation.notes),
      appId
    ]
  });
}

function clearValue(val: string | null | undefined) {
  if (val === null) {
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
  inventoryItemId: string
): Promise<QueryResult<any>> {
  return client.query({
    name: 'delete_item_annotation',
    text: `delete from item_annotations where inventory_item_id = $1`,
    values: [inventoryItemId]
  });
}

/**
 * Delete all item annotations for a user (on all platforms).
 */
export async function deleteAllItemAnnotations(
  client: ClientBase,
  bungieMembershipId: number
): Promise<QueryResult<any>> {
  return client.query({
    name: 'delete_all_item_annotations',
    text: `delete from item_annotations where membership_id = $1`,
    values: [bungieMembershipId]
  });
}
