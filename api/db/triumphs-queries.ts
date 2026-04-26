import { partition } from 'es-toolkit';
import { ClientBase, QueryResult } from 'pg';
import { metrics } from '../metrics/index.js';

/**
 * Get all of the tracked triumphs for a particular platform_membership_id.
 */
export async function getTrackedTriumphsForProfile(
  client: ClientBase,
  platformMembershipId: string,
): Promise<number[]> {
  const results = await client.query<{ record_hash: string }>({
    name: 'get_tracked_triumphs',
    text: 'SELECT record_hash FROM tracked_triumphs WHERE platform_membership_id = $1 and deleted_at IS NULL',
    values: [platformMembershipId],
  });
  return results.rows.map((row) => parseInt(row.record_hash, 10));
}

/**
 * Get all of the tracked triumphs for a particular platform_membership_id.
 */
export async function syncTrackedTriumphsForProfile(
  client: ClientBase,
  platformMembershipId: string,
  syncTimestamp: number,
): Promise<{ updated: number[]; deleted: number[] }> {
  const results = await client.query<{ record_hash: string; deleted_at: Date | null }>({
    name: 'sync_tracked_triumphs',
    text: 'SELECT record_hash, deleted_at FROM tracked_triumphs WHERE platform_membership_id = $1 and last_updated_at > $2',
    values: [platformMembershipId, new Date(syncTimestamp)],
  });

  const [updatedRows, deletedRows] = partition(results.rows, (row) => row.deleted_at === null);

  return {
    updated: updatedRows.map((row) => parseInt(row.record_hash, 10)),
    deleted: deletedRows.map((row) => parseInt(row.record_hash, 10)),
  };
}

/**
 * Add a tracked triumph.
 */
export async function trackTriumph(
  client: ClientBase,
  bungieMembershipId: number,
  platformMembershipId: string,
  recordHash: number,
): Promise<QueryResult> {
  const response = await client.query({
    name: 'insert_tracked_triumph',
    text: `insert INTO tracked_triumphs (membership_id, platform_membership_id, record_hash)
values ($1, $2, $3)
on conflict (platform_membership_id, record_hash) do update set deleted_at = null, membership_id = $1`,
    values: [bungieMembershipId, platformMembershipId, recordHash],
  });

  return response;
}

/**
 * Remove a tracked triumph.
 */
export async function unTrackTriumph(
  client: ClientBase,
  platformMembershipId: string,
  recordHash: number,
): Promise<QueryResult> {
  const response = await client.query({
    name: 'delete_tracked_triumph',
    text: `update tracked_triumphs set deleted_at = now() where platform_membership_id = $1 and record_hash = $2`,
    values: [platformMembershipId, recordHash],
  });

  if (response.rowCount! < 1) {
    // This should never happen but it's OK
    metrics.increment('db.triumphs.noRowDeleted.count', 1);
  }

  return response;
}

/**
 * Delete all item annotations for a user (on all platforms).
 */
export async function deleteAllTrackedTriumphs(
  client: ClientBase,
  platformMembershipId: number,
): Promise<QueryResult> {
  return client.query({
    name: 'delete_all_tracked_triumphs',
    text: `delete from tracked_triumphs where platform_membership_id = $1`,
    values: [platformMembershipId],
  });
}

/**
 * Soft-delete all tracked triumphs for a platform (sets deleted_at timestamp for sync support).
 */
export async function softDeleteAllTrackedTriumphs(
  client: ClientBase,
  platformMembershipId: string,
): Promise<QueryResult> {
  return client.query({
    name: 'soft_delete_all_tracked_triumphs',
    text: `update tracked_triumphs set deleted_at = now() where platform_membership_id = $1 and deleted_at is null`,
    values: [platformMembershipId],
  });
}
