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
 * Get ALL of the tracked triumphs for a particular user across all platforms.
 * @deprecated
 */
// TODO: get rid of this!
export async function getAllTrackedTriumphsForUser(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<
  {
    platformMembershipId: string;
    triumphs: number[];
  }[]
> {
  const results = await client.query<{ platform_membership_id: string; record_hash: string }>({
    name: 'get_all_tracked_triumphs',
    text: 'SELECT platform_membership_id, record_hash FROM tracked_triumphs WHERE membership_id = $1',
    values: [bungieMembershipId],
  });

  const triumphsByAccount: { [platformMembershipId: string]: number[] } = {};

  for (const row of results.rows) {
    (triumphsByAccount[row.platform_membership_id] ||= []).push(parseInt(row.record_hash, 10));
  }

  return Object.entries(triumphsByAccount).map(([platformMembershipId, triumphs]) => ({
    platformMembershipId,
    triumphs,
  }));
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
