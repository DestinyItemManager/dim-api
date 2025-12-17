import { ClientBase, QueryResult } from 'pg';
import { metrics } from '../metrics/index.js';
import { ItemHashTag, TagValue } from '../shapes/item-annotations.js';
import { TagValueEnum } from './item-annotations-queries.js';

interface ItemHashTagRow {
  item_hash: string;
  tag: TagValue | null;
  notes: string | null;
}

/**
 * Get all of the hash tags for a particular platform_membership_id and destiny_version.
 */
export async function getItemHashTagsForProfile(
  client: ClientBase,
  platformMembershipId: string,
): Promise<ItemHashTag[]> {
  const results = await client.query({
    name: 'get_item_hash_tags',
    text: 'SELECT item_hash, tag, notes FROM item_hash_tags WHERE platform_membership_id = $1 and deleted_at IS NULL',
    values: [platformMembershipId],
  });
  return results.rows.map(convertItemHashTag);
}

function convertItemHashTag(row: ItemHashTagRow): ItemHashTag {
  const result: ItemHashTag = {
    hash: parseInt(row.item_hash, 10),
  };
  if (row.tag) {
    result.tag = TagValueEnum[row.tag] as unknown as TagValue;
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
  bungieMembershipId: number,
  platformMembershipId: string,
  itemHashTag: ItemHashTag,
): Promise<QueryResult> {
  const tagValue = clearValue(itemHashTag.tag);
  const notesValue = clearValue(itemHashTag.notes);

  if (tagValue === 'clear' && notesValue === 'clear') {
    return deleteItemHashTag(client, platformMembershipId, itemHashTag.hash);
  }

  const response = await client.query({
    name: 'upsert_hash_tag',
    text: `insert INTO item_hash_tags (membership_id, platform_membership_id, item_hash, tag, notes)
values ($1, $2, $3, (CASE WHEN $4 = 0 THEN NULL ELSE $4 END), (CASE WHEN $5 = 'clear' THEN NULL ELSE $5 END))
on conflict (platform_membership_id, item_hash)
do update set (tag, notes, deleted_at) = ((CASE WHEN $4 = 0 THEN NULL WHEN $4 IS NULL THEN item_hash_tags.tag ELSE $4 END), (CASE WHEN $5 = 'clear' THEN NULL WHEN $5 IS NULL THEN item_hash_tags.notes ELSE $5 END), null)`,
    values: [
      bungieMembershipId,
      platformMembershipId,
      itemHashTag.hash,
      tagValue === null ? null : TagValueEnum[tagValue],
      notesValue,
    ],
  });

  if (response.rowCount! < 1) {
    // This should never happen!
    metrics.increment('db.itemHashTags.noRowUpdated.count', 1);
    throw new Error('hash tags - No row was updated');
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
 * Delete an item hash tags.
 */
export async function deleteItemHashTag(
  client: ClientBase,
  platformMembershipId: string,
  itemHash: number,
): Promise<QueryResult> {
  return client.query({
    name: 'delete_item_hash_tag',
    text: `update item_hash_tags set (tag, notes, deleted_at) = (null, null, now()) where platform_membership_id = $1 and item_hash = $2`,
    values: [platformMembershipId, itemHash],
  });
}

/**
 * Delete all item hash tags for a user.
 */
export async function deleteAllItemHashTags(
  client: ClientBase,
  platformMembershipId: string,
): Promise<QueryResult> {
  return client.query({
    name: 'delete_all_item_hash_tags',
    text: `delete from item_hash_tags where platform_membership_id = $1`,
    values: [platformMembershipId],
  });
}
