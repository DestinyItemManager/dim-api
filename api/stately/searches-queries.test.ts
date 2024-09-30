import { SearchType } from '../shapes/search.js';
import {
  deleteAllSearches,
  deleteSearch,
  getSearchesForProfile,
  getSearchesForUser,
  importSearch,
  saveSearch,
  updateUsedSearch,
} from './searches-queries.js';

const platformMembershipId = '213512057';

beforeEach(async () => deleteAllSearches(platformMembershipId));

it('can record a used search where none was recorded before', async () => {
  await updateUsedSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item);

  const searches = (await getSearchesForProfile(platformMembershipId, 2)).filter(
    (s) => s.usageCount > 0,
  );
  expect(searches[0].query).toBe('tag:junk');
  expect(searches[0].saved).toBe(false);
  expect(searches[0].usageCount).toBe(1);
});

it('can track search multiple times', async () => {
  await updateUsedSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item);
  await updateUsedSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item);

  const searches = (await getSearchesForProfile(platformMembershipId, 2)).filter(
    (s) => s.usageCount > 0,
  );
  expect(searches[0].query).toBe('tag:junk');
  expect(searches[0].saved).toBe(false);
  expect(searches[0].usageCount).toBe(2);
});

it('can mark a search as favorite', async () => {
  await updateUsedSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item);
  await saveSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item, true);

  const searches = (await getSearchesForProfile(platformMembershipId, 2)).filter(
    (s) => s.usageCount > 0,
  );
  expect(searches[0].query).toBe('tag:junk');
  expect(searches[0].saved).toBe(true);
  expect(searches[0].usageCount).toBe(1);

  await saveSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item, false);

  const searches2 = await getSearchesForProfile(platformMembershipId, 2);
  expect(searches2[0].query).toBe('tag:junk');
  expect(searches2[0].saved).toBe(false);
  // Save/unsave doesn't modify usage count
  expect(searches2[0].usageCount).toBe(1);
  expect(searches2[0].lastUsage).toBe(searches2[0].lastUsage);
});
it('can mark a search as favorite even when it hasnt been used', async () => {
  await saveSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item, true);

  const searches = (await getSearchesForProfile(platformMembershipId, 2)).filter(
    (s) => s.usageCount > 0,
  );
  expect(searches[0].query).toBe('tag:junk');
  expect(searches[0].saved).toBe(true);
  expect(searches[0].usageCount).toBe(1);
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
  const searches = await getSearchesForProfile(platformMembershipId, 2);
  const query = searches[searches.length - 1].query;

  await updateUsedSearch(platformMembershipId, 2, query, SearchType.Item);

  const searches2 = await getSearchesForProfile(platformMembershipId, 2);
  const search = searches2.find((s) => s.query === query);
  expect(search?.usageCount).toBe(1);
  expect(searches2.length).toBe(searches.length);
});

it('can delete a search', async () => {
  await updateUsedSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item);
  await deleteSearch(platformMembershipId, 2, 'tag:junk');

  const searches = (await getSearchesForProfile(platformMembershipId, 2)).filter(
    (s) => s.usageCount > 0,
  );
  expect(searches.length).toBe(0);
});

it('can import a search', async () => {
  await importSearch(platformMembershipId, 2, 'tag:junk', true, 1598199188576, 5, SearchType.Item);

  const searches = (await getSearchesForProfile(platformMembershipId, 2)).filter(
    (s) => s.usageCount > 0,
  );
  expect(searches[0].query).toBe('tag:junk');
  expect(searches[0].saved).toBe(true);
  expect(searches[0].usageCount).toBe(5);
});

it('can record searches for loadouts', async () => {
  await updateUsedSearch(platformMembershipId, 2, 'subclass:void', SearchType.Loadout);

  const searches = (await getSearchesForProfile(platformMembershipId, 2)).filter(
    (s) => s.usageCount > 0,
  );
  expect(searches[0].query).toBe('subclass:void');
  expect(searches[0].saved).toBe(false);
  expect(searches[0].usageCount).toBe(1);
  expect(searches[0].type).toBe(SearchType.Loadout);
});
