import { uniqBy } from 'es-toolkit';
import { ClientBase, QueryResult } from 'pg';
import { metrics } from '../metrics/index.js';
import { ExportResponse } from '../shapes/export.js';
import { DestinyVersion } from '../shapes/general.js';
import { Search, SearchType } from '../shapes/search.js';
import { KeysToSnakeCase } from '../utils.js';

interface SearchRow extends KeysToSnakeCase<Omit<Search, 'lastUpdatedAt' | 'type'>> {
  last_updated_at: Date;
  search_type: SearchType;
}

/*
 * These "canned searches" get sent to everyone as a "starter pack" of example searches that'll show up in the recent search dropdown and autocomplete.
 */
const cannedSearchesForD2: Search[] = [
  'is:blue is:haspower -is:maxpower',
  '-is:equipped is:haspower is:incurrentchar',
  '-is:exotic -is:locked -is:maxpower -is:tagged stat:total:<55',
].map((query) => ({
  query,
  saved: false,
  usageCount: 0,
  lastUsage: 0,
  type: SearchType.Item,
}));

const cannedSearchesForD1: Search[] = ['-is:equipped is:haslight is:incurrentchar'].map(
  (query) => ({
    query,
    saved: false,
    usageCount: 0,
    lastUsage: 0,
    type: SearchType.Item,
  }),
);
/*
 * Searches are stored in a single table, scoped by Bungie.net account and destiny version (D1 searches are separate from D2 searches).
 * Favorites and recent searches are stored the same - there's just a favorite flag for saved searches. There is also a usage count
 * and a last_updated_at time, so we can order by both frequency and recency (or a combination of both) and we can age out less-used
 * searches. For the best results, searches should be normalized so they match up more often.
 *
 * We can merge this with a list of global suggested searches to avoid an empty menu.
 */

/**
 * Get all of the searches for a particular destiny_version.
 */
export async function getSearchesForProfile(
  client: ClientBase,
  bungieMembershipId: number,
  destinyVersion: DestinyVersion,
): Promise<Search[]> {
  const results = await client.query({
    name: 'get_searches',
    // TODO: order by frecency
    text: 'SELECT query, saved, usage_count, search_type, last_updated_at FROM searches WHERE membership_id = $1 and destiny_version = $2 order by last_updated_at DESC, usage_count DESC LIMIT 500',
    values: [bungieMembershipId, destinyVersion],
  });
  return uniqBy(
    results.rows
      .map(convertSearch)
      .concat(destinyVersion === 2 ? cannedSearchesForD2 : cannedSearchesForD1),
    (s) => s.query,
  );
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
    text: 'SELECT destiny_version, query, saved, usage_count, search_type, last_updated_at FROM searches WHERE membership_id = $1',
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
    lastUsage: row.last_updated_at.getTime(),
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
  appId: string,
  bungieMembershipId: number,
  destinyVersion: DestinyVersion,
  query: string,
  type: SearchType,
): Promise<QueryResult> {
  const response = await client.query({
    name: 'upsert_search',
    text: `insert INTO searches (membership_id, destiny_version, query, search_type, created_by, last_updated_by)
values ($1, $2, $3, $5, $4, $4)
on conflict (membership_id, destiny_version, qhash)
do update set (usage_count, last_used, last_updated_at, last_updated_by) = (searches.usage_count + 1, current_timestamp, current_timestamp, $4)`,
    values: [bungieMembershipId, destinyVersion, query, appId, type],
  });

  if (response.rowCount! < 1) {
    // This should never happen!
    metrics.increment('db.searches.noRowUpdated.count', 1);
    throw new Error('searches - No row was updated');
  }

  return response;
}

/**
 * Save/unsave a search. This assumes the search exists.
 */
export async function saveSearch(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  destinyVersion: DestinyVersion,
  query: string,
  type: SearchType,
  saved?: boolean,
): Promise<QueryResult> {
  const response = await client.query({
    name: 'save_search',
    text: `UPDATE searches SET (saved, last_updated_by) = ($4, $5) WHERE membership_id = $1 AND destiny_version = $2 AND qhash = decode(md5($3), 'hex') AND query = $3`,
    values: [bungieMembershipId, destinyVersion, query, saved, appId],
  });

  if (response.rowCount! < 1) {
    // Someone saved a search they haven't used!
    metrics.increment('db.searches.noRowUpdated.count', 1);
    const insertSavedResponse = await client.query({
      name: 'insert_search_fallback',
      text: `insert INTO searches (membership_id, destiny_version, query, search_type, saved, created_by, last_updated_by)
  values ($1, $2, $3, $5, true, $4, $4)`,
      values: [bungieMembershipId, destinyVersion, query, appId, type],
    });
    return insertSavedResponse;
  }

  return response;
}
/**
 * Insert a single search as part of an import.
 */
export async function importSearch(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  destinyVersion: DestinyVersion,
  query: string,
  saved: boolean,
  lastUsage: number,
  usageCount: number,
  type: SearchType,
): Promise<QueryResult> {
  const response = await client.query({
    name: 'insert_search',
    text: `insert INTO searches (membership_id, destiny_version, query, saved, search_type, usage_count, last_used, created_by, last_updated_by)
values ($1, $2, $3, $4, $8, $5, $6, $7, $7)`,
    values: [
      bungieMembershipId,
      destinyVersion,
      query,
      saved,
      usageCount,
      new Date(lastUsage),
      appId,
      type,
    ],
  });

  if (response.rowCount! < 1) {
    // This should never happen!
    metrics.increment('db.searches.noRowUpdated.count', 1);
    throw new Error('searches - No row was updated');
  }

  return response;
}

/**
 * Delete a single search
 */
export async function deleteSearch(
  client: ClientBase,
  bungieMembershipId: number,
  destinyVersion: DestinyVersion,
  query: string,
  type: SearchType,
): Promise<QueryResult> {
  return client.query({
    name: 'delete_search',
    text: `delete from searches where membership_id = $1 and destiny_version = $2 and qhash = decode(md5($3), 'hex') and query = $3 and search_type = $4`,
    values: [bungieMembershipId, destinyVersion, query, type],
  });
}

/**
 * Delete all searches for a user (for all destiny versions).
 */
export async function deleteAllSearches(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<QueryResult> {
  return client.query({
    name: 'delete_all_searches',
    text: `delete from searches where membership_id = $1`,
    values: [bungieMembershipId],
  });
}
