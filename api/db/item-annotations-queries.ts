import { ClientBase, QueryResult } from 'pg';
import { ItemAnnotation } from '../shapes/item-annotations';
import { DestinyVersion } from '../shapes/general';
import { metrics } from '../metrics';

/**
 * Get all of the item annotations for a particular platform_membership_id and destiny_version.
 */
export async function getItemAnnotationsForProfile(
  client: ClientBase,
  bungieMembershipId: number,
  platformMembershipId: string,
  destinyVersion: DestinyVersion
): Promise<ItemAnnotation[]> {
  const results = await client.query({
    name: 'get_item_annotations',
    text:
      'SELECT inventory_item_id, tag, notes FROM item_annotations WHERE membership_id = $1 and platform_membership_id = $2  and destiny_version = $3',
    values: [bungieMembershipId, platformMembershipId, destinyVersion],
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
    name: 'get_all_item_annotations',
    text:
      'SELECT platform_membership_id, destiny_version, inventory_item_id, tag, notes FROM item_annotations WHERE membership_id = $1',
    values: [bungieMembershipId],
  });
  return results.rows.map((row) => ({
    platformMembershipId: row.platform_membership_id,
    destinyVersion: row.destiny_version,
    annotation: convertItemAnnotation(row),
  }));
}

function convertItemAnnotation(row: any): ItemAnnotation {
  const result: ItemAnnotation = {
    id: row.inventory_item_id,
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
export async function updateItemAnnotation(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  itemAnnotation: ItemAnnotation
): Promise<QueryResult<any>> {
  const tagValue = clearValue(itemAnnotation.tag);
  const notesValue = clearValue(itemAnnotation.notes);

  if (tagValue === 'clear' && notesValue === 'clear') {
    return deleteItemAnnotation(client, bungieMembershipId, itemAnnotation.id);
  }

  const response = await client.query({
    name: 'upsert_item_annotation',
    text: `insert INTO item_annotations (membership_id, platform_membership_id, destiny_version, inventory_item_id, tag, notes, created_by, last_updated_by)
values ($1, $2, $3, $4, (CASE WHEN $5 = 'clear'::item_tag THEN NULL ELSE $5 END)::item_tag, (CASE WHEN $6 = 'clear' THEN NULL ELSE $6 END), $7, $7)
on conflict (membership_id, inventory_item_id)
do update set (tag, notes, last_updated_at, last_updated_by) = ((CASE WHEN $5 = 'clear' THEN NULL WHEN $5 IS NULL THEN item_annotations.tag ELSE $5 END), (CASE WHEN $6 = 'clear' THEN NULL WHEN $6 IS NULL THEN item_annotations.notes ELSE $6 END), current_timestamp, $7)`,
    values: [
      bungieMembershipId,
      platformMembershipId,
      destinyVersion,
      itemAnnotation.id,
      tagValue,
      notesValue,
      appId,
    ],
  });

  if (response.rowCount < 1) {
    // This should never happen!
    metrics.increment('db.itemAnnotations.noRowUpdated.count', 1);
    throw new Error('No row was updated');
  }

  return response;
}

/**
 * If the value is explicitly set to null or empty string, we return "clear" which will remove the value from the database.
 * If it's undefined we return null, which will preserve the existing value.
 * If it's set, we'll return the input which will update the existing value.
 */
function clearValue(val: string | null | undefined) {
  if (val === null || (val !== undefined && val.length === 0)) {
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
  bungieMembershipId: number,
  inventoryItemId: string
): Promise<QueryResult<any>> {
  return client.query({
    name: 'delete_item_annotation',
    text: `delete from item_annotations where membership_id = $1 and inventory_item_id = $2`,
    values: [bungieMembershipId, inventoryItemId],
  });
}

/**
 * Delete an item annotation.
 */
export async function deleteItemAnnotationList(
  client: ClientBase,
  bungieMembershipId: number,
  inventoryItemIds: string[]
): Promise<QueryResult<any>> {
  return client.query({
    name: 'delete_item_annotation_list',
    text: `delete from item_annotations where membership_id = $1 and inventory_item_id = ANY($2::text[])`,
    values: [bungieMembershipId, inventoryItemIds],
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
    values: [bungieMembershipId],
  });
}
