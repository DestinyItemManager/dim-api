import { partition, uniqBy } from 'es-toolkit';
import { ClientBase, QueryResult } from 'pg';
import { metrics } from '../metrics/index.js';
import { ExportResponse } from '../shapes/export.js';
import { DestinyVersion } from '../shapes/general.js';
import { Search, SearchType } from '../shapes/search.js';
import { KeysToSnakeCase } from '../utils.js';

interface SearchRow extends KeysToSnakeCase<Omit<Search, 'lastUsage' | 'type'>> {
  last_used: Date;
  search_type: SearchType;
}

/*
 * Searches are stored in a single table, scoped by Bungie.net account and destiny version (D1 searches are separate from D2 searches).
 * Favorites and recent searches are stored the same - there's just a favorite flag for saved searches. There is also a usage count
 * and a last_updated_at time, so we can order by both frequency and recency (or a combination of both) and we can age out less-used
 * searches. For the best results, searches should be normalized so they match up more often.
 *
 * We can merge this with a list of global suggested searches to avoid an empty menu.
 */

/**
 * Get all of the searches for a particular platformMembershipId and destiny_version.
 */
export async function getSearchesForProfile(
  client: ClientBase,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
): Promise<Search[]> {
  const results = await client.query<SearchRow>({
    name: 'get_searches',
    text: 'SELECT query, saved, usage_count, search_type, last_used FROM searches WHERE platform_membership_id = $1 and destiny_version = $2 and deleted_at is null order by saved DESC, last_used DESC, usage_count DESC LIMIT 500',
    values: [platformMembershipId, destinyVersion],
  });
  return uniqBy(results.rows.map(convertSearch), (s) => s.query);
}

/**
 * Get all of the searches for a particular platformMembershipId and destiny_version that have changed since the token timestamp, including tombstone rows.
 */
export async function syncSearchesForProfile(
  client: ClientBase,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  syncTimestamp: number,
): Promise<{ updated: Search[]; deletedSearchHashes: string[] }> {
  const results = await client.query<SearchRow & { deleted_at: Date | null; qhash: string }>({
    name: 'get_searches',
    text: 'SELECT query, qhash, saved, usage_count, search_type, last_used, deleted_at FROM searches WHERE platform_membership_id = $1 and destiny_version = $2 and last_updated_at > $3',
    values: [platformMembershipId, destinyVersion, new Date(syncTimestamp)],
  });

  const [updatedRows, deletedRows] = partition(results.rows, (row) => row.deleted_at === null);

  return {
    updated: updatedRows.map(convertSearch),
    deletedSearchHashes: deletedRows.map((row) => row.qhash),
  };
}

/**
 * Get ALL of the searches for a particular user across all destiny versions.
 */
export async function getSearchesForUser(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<ExportResponse['searches']> {
  // TODO: this isn't indexed!
  const results = await client.query<SearchRow & { destiny_version: DestinyVersion }>({
    name: 'get_all_searches',
    text: 'SELECT destiny_version, query, saved, usage_count, search_type, last_used FROM searches WHERE membership_id = $1',
    values: [bungieMembershipId],
  });
  return results.rows.map((row) => ({
    destinyVersion: row.destiny_version,
    search: convertSearch(row),
  }));
}

function convertSearch(row: SearchRow): Search {
  return {
    query: row.query,
    usageCount: row.usage_count,
    saved: row.saved,
    lastUsage: row.last_used.getTime(),
    type: row.search_type,
  };
}

/**
 * Insert or update (upsert) a single search.
 *
 * It's a bit odd that saving/unsaving a search counts as a "usage" but that's probably OK
 */
export async function updateUsedSearch(
  client: ClientBase,
  bungieMembershipId: number,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  query: string,
  type: SearchType,
): Promise<QueryResult> {
  const response = await client.query({
    name: 'upsert_search',
    text: `insert INTO searches (membership_id, platform_membership_id, destiny_version, query, search_type)
values ($1, $2, $3, $4, $5)
on conflict (platform_membership_id, destiny_version, qhash)
do update set (usage_count, last_used, deleted_at) = (CASE WHEN searches.deleted_at IS NOT NULL THEN 1 ELSE searches.usage_count + 1 END, current_timestamp, null)`,
    values: [bungieMembershipId, platformMembershipId, destinyVersion, query, type],
  });

  if (response.rowCount! < 1) {
    // This should never happen!
    metrics.increment('db.searches.noRowUpdated.count', 1);
    throw new Error('searches - No row was updated');
  }

  return response;
}

/**
 * Save/unsave a search.
 */
export async function saveSearch(
  client: ClientBase,
  bungieMembershipId: number,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  query: string,
  type: SearchType,
  saved?: boolean,
): Promise<void> {
  await client.query({
    name: 'save_search',
    text: `INSERT INTO searches (membership_id, platform_membership_id, destiny_version, query, search_type, saved)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (platform_membership_id, destiny_version, qhash)
DO UPDATE SET (saved, usage_count, deleted_at) = ($6, CASE WHEN searches.deleted_at IS NOT NULL THEN 1 ELSE searches.usage_count END, null)`,
    values: [bungieMembershipId, platformMembershipId, destinyVersion, query, type, saved],
  });
}
/**
 * Insert a single search as part of an import.
 */
export async function importSearch(
  client: ClientBase,
  bungieMembershipId: number,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  query: string,
  saved: boolean,
  lastUsage: number,
  usageCount: number,
  type: SearchType,
): Promise<void> {
  await client.query({
    name: 'insert_search',
    text: `insert INTO searches (membership_id, platform_membership_id, destiny_version, query, saved, search_type, usage_count, last_used)
values ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (platform_membership_id, destiny_version, qhash)
DO UPDATE SET (saved, usage_count, last_used, deleted_at) = ($5, $7, $8, null)`,
    values: [
      bungieMembershipId,
      platformMembershipId,
      destinyVersion,
      query,
      saved,
      type,
      usageCount,
      new Date(lastUsage),
    ],
  });
}

/**
 * Delete a single search
 */
export async function deleteSearch(
  client: ClientBase,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  query: string,
  type: SearchType,
): Promise<QueryResult> {
  return client.query({
    name: 'delete_search',
    text: `update searches set deleted_at = now() where platform_membership_id = $1 and destiny_version = $2 and qhash = decode(md5($3), 'hex') and query = $3 and search_type = $4`,
    values: [platformMembershipId, destinyVersion, query, type],
  });
}

/**
 * Delete all searches for a user (for all destiny versions).
 */
export async function deleteAllSearches(
  client: ClientBase,
  platformMembershipId: string,
): Promise<QueryResult> {
  return client.query({
    name: 'delete_all_searches',
    text: `delete from searches where platform_membership_id = $1`,
    values: [platformMembershipId],
  });
}
