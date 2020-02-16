import { ClientBase, QueryResult } from 'pg';
import { ItemAnnotation } from '../shapes/item-annotations';
import { DestinyVersion } from '../shapes/general';

/**
 * Get all of the item annotations for a particular platform_membership_id and destiny_version.
 */
export async function getItemAnnotationsForProfile(
  client: ClientBase,
  platformMembershipId: string,
  destinyVersion: DestinyVersion
): Promise<ItemAnnotation[]> {
  const results = await client.query({
    name: 'get_item_annotations',
    text:
      'SELECT inventory_item_id, tag, notes FROM item_annotations WHERE platform_membership_id = $1 and destiny_version = $2',
    values: [platformMembershipId, destinyVersion]
  });
  return results.rows.map(convertItemAnnotation);
}

/**
 * Get ALL of the item annotations for a particular user across all platforms.
 */
export async function getAllItemAnnotationsForUser(
  client: ClientBase,
  bungieMembershipId: number
): Promise<
  {
    platformMembershipId: string;
    destinyVersion: DestinyVersion;
    annotation: ItemAnnotation;
  }[]
> {
  // TODO: this isn't indexed!
  const results = await client.query({
    name: 'get_item_annotations',
    text:
      'SELECT platform_membership_id, destiny_version, inventory_item_id, tag, notes FROM item_annotations WHERE membership_id = $1',
    values: [bungieMembershipId]
  });
  return results.rows.map((row) => ({
    platformMembershipId: row.platform_membership_id,
    destinyVersion: row.destinyVersion,
    annotation: convertItemAnnotation(row)
  }));
}

function convertItemAnnotation(row: any): ItemAnnotation {
  const result: ItemAnnotation = {
    id: row.id
  };
  if (row.tag) {
    result.tag = row.tag;
  }
  if (row.notes) {
    result.notes = row.notes;
  }
  return result;
}

/**
 * Insert or update (upsert) a single item annotation. Loadouts are totally replaced when updated.
 */
// TODO: Figure out how to prevent users from modifying data from other users. Maybe partition everything by membership ID in primary key?
export async function updateItemAnnotation(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  itemAnnotation: ItemAnnotation
): Promise<QueryResult<any>> {
  // TODO: if both are null, issue a delete? or just tombstone them?
  if (!itemAnnotation.notes && !itemAnnotation.tag) {
    return deleteItemAnnotation(client, itemAnnotation.id);
  }

  return client.query({
    name: 'upsert_item_annotation',
    text: `insert INTO item_annotations (membership_id, platform_membership_id, destiny_version, inventory_item_id, tag, notes, created_by, last_updated_by)
values ($1, $2, $3, $4, (CASE WHEN $5 = 'clear' THEN NULL ELSE $5 END), (CASE WHEN $6 = 'clear' THEN NULL ELSE $6 END), $7, $7)
on conflict (inventory_item_id)
do update set (tag, notes, last_updated_at, last_updated_by) = ((CASE WHEN $5 = 'clear' THEN NULL WHEN $5 = null THEN item_annotations.tag ELSE $5 END), (CASE WHEN $6 = 'clear' THEN NULL WHEN $6 = null THEN item_annotations.notes ELSE $6 END), current_timestamp, $7) where membership_id = $1`,
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

/**
 * If the value is explicitly set to null or empty string, we return "clear" which will remove the value from the database.
 * If it's undefined we return null, which will preserve the existing value.
 * If it's set, we'll return the input which will update the existing value.
 */
function clearValue(val: string | null | undefined) {
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
