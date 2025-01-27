import { DestinyVersion } from '../shapes/general.js';
import { SearchType } from '../shapes/search.js';
import { client } from './client.js';
import {
  cannedSearches,
  deleteAllSearches,
  deleteSearch,
  getSearchesForProfile,
  getSearchesForUser,
  updateSearches,
} from './searches-queries.js';

const platformMembershipId = '213512057';

beforeEach(async () => deleteAllSearches(platformMembershipId));

async function updateUsedSearch(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  query: string,
  type: SearchType,
) {
  return client.transaction(async (txn) => {
    await updateSearches(txn, platformMembershipId, destinyVersion, [
      {
        query,
        type,
        saved: false,
        incrementUsed: 1,
        deleted: false,
      },
    ]);
  });
}

async function saveSearch(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  query: string,
  type: SearchType,
  saved: boolean,
) {
  return client.transaction(async (txn) => {
    await updateSearches(txn, platformMembershipId, destinyVersion, [
      {
        query,
        type,
        saved,
        incrementUsed: 0,
        deleted: false,
      },
    ]);
  });
}

it('can record a used search where none was recorded before', async () => {
  await updateUsedSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item);

  const searches = (await getSearchesForProfile(platformMembershipId, 2)).searches.filter(
    (s) => s.usageCount > 0,
  );
  expect(searches[0].query).toBe('tag:junk');
  expect(searches[0].saved).toBe(false);
  expect(searches[0].usageCount).toBe(1);
});

it('can track search multiple times', async () => {
  await updateUsedSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item);
  await updateUsedSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item);

  const searches = (await getSearchesForProfile(platformMembershipId, 2)).searches.filter(
    (s) => s.usageCount > 0,
  );
  expect(searches[0].query).toBe('tag:junk');
  expect(searches[0].saved).toBe(false);
  expect(searches[0].usageCount).toBe(2);
});

it('can mark a search as favorite', async () => {
  await updateUsedSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item);
  await saveSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item, true);

  const searches = (await getSearchesForProfile(platformMembershipId, 2)).searches.filter(
    (s) => s.usageCount > 0,
  );
  expect(searches[0].query).toBe('tag:junk');
  expect(searches[0].saved).toBe(true);
  expect(searches[0].usageCount).toBe(1);

  await saveSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item, false);

  const searches2 = (await getSearchesForProfile(platformMembershipId, 2)).searches;
  expect(searches2[0].query).toBe('tag:junk');
  expect(searches2[0].saved).toBe(false);
  // Save/unsave doesn't modify usage count
  expect(searches2[0].usageCount).toBe(1);
  expect(searches2[0].lastUsage).toBe(searches2[0].lastUsage);
});
it('can mark a search as favorite even when it hasnt been used', async () => {
  await saveSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item, true);

  const searches = (await getSearchesForProfile(platformMembershipId, 2)).searches;
  expect(searches[0].query).toBe('tag:junk');
  expect(searches[0].saved).toBe(true);
  expect(searches[0].usageCount).toBe(0);
});

it('can get all searches across profiles', async () => {
  await updateUsedSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item);
  await updateUsedSearch(platformMembershipId, 1, 'is:tagged', SearchType.Item);

  const searches = (await getSearchesForUser(platformMembershipId)).filter(
    (s) => s.search.usageCount > 0,
  );
  expect(searches.length).toEqual(2);
});

it('can increment usage for one of the built-in searches', async () => {
  const query = cannedSearches(2)[0].query;

  await updateUsedSearch(platformMembershipId, 2, query, SearchType.Item);

  const searches2 = (await getSearchesForProfile(platformMembershipId, 2)).searches;
  const search = searches2.find((s) => s.query === query);
  expect(search?.usageCount).toBe(1);
  expect(searches2.length).toBe(1);
});

it('can delete a search', async () => {
  await updateUsedSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item);
  await client.transaction(async (txn) => {
    await deleteSearch(txn, platformMembershipId, 2, ['tag:junk']);
  });

  const searches = (await getSearchesForProfile(platformMembershipId, 2)).searches.filter(
    (s) => s.usageCount > 0,
  );
  expect(searches.length).toBe(0);
});

it('can record searches for loadouts', async () => {
  await updateUsedSearch(platformMembershipId, 2, 'subclass:void', SearchType.Loadout);

  const searches = (await getSearchesForProfile(platformMembershipId, 2)).searches.filter(
    (s) => s.usageCount > 0,
  );
  expect(searches[0].query).toBe('subclass:void');
  expect(searches[0].saved).toBe(false);
  expect(searches[0].usageCount).toBe(1);
  expect(searches[0].type).toBe(SearchType.Loadout);
});
