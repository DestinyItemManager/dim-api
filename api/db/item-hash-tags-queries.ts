import { ClientBase, QueryResult } from 'pg';
import { ItemHashTag } from '../shapes/item-annotations';
import { metrics } from '../metrics';

/**
 * Get all of the hash tags for a particular platform_membership_id and destiny_version.
 */
export async function getItemHashTagsForProfile(
  client: ClientBase,
  bungieMembershipId: number
): Promise<ItemHashTag[]> {
  try {
    const results = await client.query({
      name: 'get_item_hash_tags',
      text:
        'SELECT item_hash, tag, notes FROM item_hash_tags WHERE membership_id = $1',
      values: [bungieMembershipId],
    });
    return results.rows.map(convertItemHashTag);
  } catch (e) {
    throw new Error(e.name + ': ' + e.message);
  }
}

function convertItemHashTag(row: any): ItemHashTag {
  const result: ItemHashTag = {
    hash: parseInt(row.item_hash, 10),
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
export async function updateItemHashTag(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  itemHashTag: ItemHashTag
): Promise<QueryResult<any>> {
  const tagValue = clearValue(itemHashTag.tag);
  const notesValue = clearValue(itemHashTag.notes);

  if (tagValue === 'clear' && notesValue === 'clear') {
    return deleteItemHashTag(client, bungieMembershipId, itemHashTag.hash);
  }

  try {
    const response = await client.query({
      name: 'upsert_hash_tag',
      text: `insert INTO item_hash_tags (membership_id, item_hash, tag, notes, created_by, last_updated_by)
values ($1, $2, (CASE WHEN $3 = 'clear'::item_tag THEN NULL ELSE $3 END)::item_tag, (CASE WHEN $4 = 'clear' THEN NULL ELSE $4 END), $5, $5)
on conflict (membership_id, item_hash)
do update set (tag, notes, last_updated_at, last_updated_by) = ((CASE WHEN $3 = 'clear' THEN NULL WHEN $3 IS NULL THEN item_hash_tags.tag ELSE $3 END), (CASE WHEN $4 = 'clear' THEN NULL WHEN $4 IS NULL THEN item_hash_tags.notes ELSE $4 END), current_timestamp, $5)`,
      values: [
        bungieMembershipId,
        itemHashTag.hash,
        tagValue,
        notesValue,
        appId,
      ],
    });

    if (response.rowCount < 1) {
      // This should never happen!
      metrics.increment('db.itemHashTags.noRowUpdated.count', 1);
      throw new Error('hash tags - No row was updated');
    }

    return response;
  } catch (e) {
    throw new Error(e.name + ': ' + e.message);
  }
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
 * Delete an item hash tags.
 */
export async function deleteItemHashTag(
  client: ClientBase,
  bungieMembershipId: number,
  itemHash: number
): Promise<QueryResult<any>> {
  try {
    return client.query({
      name: 'delete_item_hash_tag',
      text: `delete from item_hash_tags where membership_id = $1 and item_hash = $2`,
      values: [bungieMembershipId, itemHash],
    });
  } catch (e) {
    throw new Error(e.name + ': ' + e.message);
  }
}

/**
 * Delete all item hash tags for a user.
 */
export async function deleteAllItemHashTags(
  client: ClientBase,
  bungieMembershipId: number
): Promise<QueryResult<any>> {
  try {
    return client.query({
      name: 'delete_all_item_hash_tags',
      text: `delete from item_hash_tags where membership_id = $1`,
      values: [bungieMembershipId],
    });
  } catch (e) {
    throw new Error(e.name + ': ' + e.message);
  }
}
