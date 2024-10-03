import { keyPath } from '@stately-cloud/client';
import _ from 'lodash';
import crypto from 'node:crypto';
import { metrics } from '../metrics/index.js';
import { ExportResponse } from '../shapes/export.js';
import { DestinyVersion } from '../shapes/general.js';
import { Search, SearchType } from '../shapes/search.js';
import { client } from './client.js';
import { Search as StatelySearch, SearchType as StatelySearchType } from './generated/index.js';
import { batches } from './stately-utils.js';

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

function queryHash(query: string) {
  return crypto.createHash('md5').update(query).digest();
}

export function keyFor(
  platformMembershipId: string | bigint,
  destinyVersion: DestinyVersion,
  query: string,
) {
  return keyPath`/p-${BigInt(platformMembershipId)}/d-${destinyVersion}/search-${queryHash(query)}`;
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
 * Get all of the searches for a particular destiny_version.
 */
export async function getSearchesForProfile(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
): Promise<Search[]> {
  const results: Search[] = [];
  const iter = client.beginList(
    keyPath`/p-${BigInt(platformMembershipId)}/d-${destinyVersion}/search`,
    // TODO: This isn't actually the same as the PG version, which grabbed the
    // 500 *most recent* searches. We can do that with a groupLocalIndex, once
    // we expose that in the client.
    { limit: 500 },
  );

  for await (const item of iter) {
    if (client.isType(item, 'Search')) {
      results.push(convertSearchFromStately(item));
    }
  }

  results.push(...(destinyVersion === 2 ? cannedSearchesForD2 : cannedSearchesForD1));

  return _.sortBy(
    _.uniqBy(results, (s) => s.query),
    [(s) => -s.lastUsage, (s) => s.usageCount],
  );
}

export function convertSearchFromStately(item: StatelySearch): Search {
  return {
    query: item.query,
    usageCount: item.usageCount,
    saved: item.saved,
    lastUsage: Number(item.lastUsage),
    type: item.type === StatelySearchType.SearchType_Item ? SearchType.Item : SearchType.Loadout,
  };
}

/**
 * Get ALL of the searches for a particular user across all destiny versions.
 */
export async function getSearchesForUser(
  platformMembershipId: string,
): Promise<ExportResponse['searches']> {
  // Rather than list ALL items under the profile and filter down to searches,
  // just separately get the D1 and D2 searches. We probably won't use this -
  // for export we *will* scrape a whole profile.
  const d1Searches = getSearchesForProfile(platformMembershipId, 1);
  const d2Searches = getSearchesForProfile(platformMembershipId, 2);
  return (await d1Searches)
    .map((a) => ({ destinyVersion: 1 as DestinyVersion, search: a }))
    .concat(
      (await d2Searches).map((a) => ({
        destinyVersion: 2 as DestinyVersion,
        search: a,
      })),
    );
}

/**
 * Insert or update (upsert) a single search.
 *
 * It's a bit odd that saving/unsaving a search counts as a "usage" but that's probably OK
 */
export async function updateUsedSearch(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  query: string,
  type: SearchType,
): Promise<void> {
  // Either update an existing search, or create a new one
  await client.transaction(async (txn) => {
    let search = await txn.get('Search', keyFor(platformMembershipId, destinyVersion, query));
    if (search && search.query !== query) {
      // This should never happen!
      metrics.increment('db.searches.hashCollision.count', 1);
      throw new Error('searches - query hash collision');
    }
    if (!search) {
      search = newSearch(platformMembershipId, destinyVersion, type, query);
    }
    search.usageCount++;
    search.lastUsage = BigInt(Date.now());
    await txn.put(search);
  });
}

function newSearch(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  type: SearchType,
  query: string,
) {
  return client.create('Search', {
    query,
    qhash: queryHash(query),
    saved: false,
    type:
      type === SearchType.Item
        ? StatelySearchType.SearchType_Item
        : StatelySearchType.SearchType_Loadout,
    profileId: BigInt(platformMembershipId),
    destinyVersion,
  });
}

/**
 * Save/unsave a search. This assumes the search exists.
 */
export async function saveSearch(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  query: string,
  type: SearchType,
  saved: boolean,
): Promise<void> {
  await client.transaction(async (txn) => {
    let search = await txn.get('Search', keyFor(platformMembershipId, destinyVersion, query));
    if (search && search.query !== query) {
      // This should never happen!
      metrics.increment('db.searches.hashCollision.count', 1);
      throw new Error('searches - query hash collision');
    }
    if (!search) {
      search = newSearch(platformMembershipId, destinyVersion, type, query);
      search.usageCount = 1;
    }
    search.saved = saved;
    search.lastUsage = BigInt(Date.now());
    await txn.put(search);
  });
}

/**
 * Insert a single search as part of an import.
 */
export async function importSearch(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  query: string,
  saved: boolean,
  lastUsage: number,
  usageCount: number,
  type: SearchType,
): Promise<void> {
  await client.put(
    client.create('Search', {
      query,
      qhash: queryHash(query),
      saved,
      usageCount,
      lastUsage: BigInt(lastUsage),
      type:
        type === SearchType.Item
          ? StatelySearchType.SearchType_Item
          : StatelySearchType.SearchType_Loadout,
      profileId: BigInt(platformMembershipId),
      destinyVersion,
    }),
  );
}

export function importSearches(
  platformMembershipId: string,
  searches: {
    destinyVersion: DestinyVersion;
    search: Search;
  }[],
) {
  return searches
    .filter(({ search }) => search.query)
    .map(({ destinyVersion, search }) =>
      client.create('Search', {
        query: search.query,
        qhash: queryHash(search.query),
        saved: search.saved,
        usageCount: search.usageCount,
        lastUsage: BigInt(search.lastUsage),
        type:
          search.type === SearchType.Item
            ? StatelySearchType.SearchType_Item
            : StatelySearchType.SearchType_Loadout,
        profileId: BigInt(platformMembershipId),
        destinyVersion,
      }),
    );
}

/**
 * Delete a single search
 */
export async function deleteSearch(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  query: string,
): Promise<void> {
  // TODO: We really should check that it's the right type of query, but realistically they're unique by query text.
  await client.del(keyFor(platformMembershipId, destinyVersion, query));
}

/**
 * Delete all searches for a user (for all destiny versions).
 */
export async function deleteAllSearches(platformMembershipId: string): Promise<void> {
  const searches = (await getSearchesForUser(platformMembershipId)).filter(
    (s) => s.search.usageCount > 0,
  );
  if (!searches.length) {
    return;
  }
  for (const batch of batches(searches)) {
    await client.del(
      ...batch.map((search) =>
        keyFor(platformMembershipId, search.destinyVersion, search.search.query),
      ),
    );
  }
}
