import { SearchType } from '../shapes/search.js';
import { closeDbPool, transaction } from './index.js';
import {
  deleteAllSearches,
  deleteSearch,
  getSearchesForProfile,
  importSearch,
  saveSearch,
  softDeleteAllSearches,
  updateUsedSearch,
} from './searches-queries.js';

const bungieMembershipId = 4321;
const platformMembershipId = '213512057';

beforeEach(() =>
  transaction(async (client) => {
    await deleteAllSearches(client, platformMembershipId);
  }),
);

afterAll(async () => closeDbPool());

it('can record a used search where none was recorded before', async () => {
  await transaction(async (client) => {
    await updateUsedSearch(
      client,
      bungieMembershipId,
      platformMembershipId,
      2,
      'tag:junk',
      SearchType.Item,
    );

    const searches = (await getSearchesForProfile(client, platformMembershipId, 2)).filter(
      (s) => s.usageCount > 0,
    );
    expect(searches[0].query).toBe('tag:junk');
    expect(searches[0].saved).toBe(false);
    expect(searches[0].usageCount).toBe(1);
  });
});

it('can track search multiple times', async () => {
  await transaction(async (client) => {
    await updateUsedSearch(
      client,
      bungieMembershipId,
      platformMembershipId,
      2,
      'tag:junk',
      SearchType.Item,
    );
    await updateUsedSearch(
      client,
      bungieMembershipId,
      platformMembershipId,
      2,
      'tag:junk',
      SearchType.Item,
    );

    const searches = (await getSearchesForProfile(client, platformMembershipId, 2)).filter(
      (s) => s.usageCount > 0,
    );
    expect(searches[0].query).toBe('tag:junk');
    expect(searches[0].saved).toBe(false);
    expect(searches[0].usageCount).toBe(2);
  });
});

it('can mark a search as favorite', async () => {
  await transaction(async (client) => {
    await updateUsedSearch(
      client,
      bungieMembershipId,
      platformMembershipId,
      2,
      'tag:junk',
      SearchType.Item,
    );
    await saveSearch(
      client,
      bungieMembershipId,
      platformMembershipId,
      2,
      'tag:junk',
      SearchType.Item,
      true,
    );

    const searches = (await getSearchesForProfile(client, platformMembershipId, 2)).filter(
      (s) => s.usageCount > 0,
    );
    expect(searches[0].query).toBe('tag:junk');
    expect(searches[0].saved).toBe(true);
    expect(searches[0].usageCount).toBe(1);

    await saveSearch(
      client,
      bungieMembershipId,
      platformMembershipId,
      2,
      'tag:junk',
      SearchType.Item,
      false,
    );

    const searches2 = await getSearchesForProfile(client, platformMembershipId, 2);
    expect(searches2[0].query).toBe('tag:junk');
    expect(searches2[0].saved).toBe(false);
    // Save/unsave doesn't modify usage count
    expect(searches2[0].usageCount).toBe(1);
    expect(searches2[0].lastUsage).toBe(searches2[0].lastUsage);
  });
});
it('can mark a search as favorite even when it hasnt been used', async () => {
  await transaction(async (client) => {
    await saveSearch(
      client,
      bungieMembershipId,
      platformMembershipId,
      2,
      'tag:junk',
      SearchType.Item,
      true,
    );

    const searches = (await getSearchesForProfile(client, platformMembershipId, 2)).filter(
      (s) => s.usageCount > 0,
    );
    expect(searches[0].query).toBe('tag:junk');
    expect(searches[0].saved).toBe(true);
    expect(searches[0].usageCount).toBe(1);
  });
});

it('can delete a search', async () => {
  await transaction(async (client) => {
    await updateUsedSearch(
      client,
      bungieMembershipId,
      platformMembershipId,
      2,
      'tag:junk',
      SearchType.Item,
    );
    await deleteSearch(client, platformMembershipId, 2, 'tag:junk', SearchType.Item);

    const searches = (await getSearchesForProfile(client, platformMembershipId, 2)).filter(
      (s) => s.usageCount > 0,
    );
    expect(searches.length).toBe(0);
  });
});

it('can import a search', async () => {
  await transaction(async (client) => {
    await importSearch(
      client,
      bungieMembershipId,
      platformMembershipId,
      2,
      'tag:junk',
      true,
      1598199188576,
      5,
      SearchType.Item,
    );

    const searches = (await getSearchesForProfile(client, platformMembershipId, 2)).filter(
      (s) => s.usageCount > 0,
    );
    expect(searches[0].query).toBe('tag:junk');
    expect(searches[0].saved).toBe(true);
    expect(searches[0].usageCount).toBe(5);
  });
});

it('can record searches for loadouts', async () => {
  await transaction(async (client) => {
    await updateUsedSearch(
      client,
      bungieMembershipId,
      platformMembershipId,
      2,
      'subclass:void',
      SearchType.Loadout,
    );

    const searches = (await getSearchesForProfile(client, platformMembershipId, 2)).filter(
      (s) => s.usageCount > 0,
    );
    expect(searches[0].query).toBe('subclass:void');
    expect(searches[0].saved).toBe(false);
    expect(searches[0].usageCount).toBe(1);
    expect(searches[0].type).toBe(SearchType.Loadout);
  });
});

it('can soft delete all searches', async () => {
  await transaction(async (client) => {
    await updateUsedSearch(
      client,
      bungieMembershipId,
      platformMembershipId,
      2,
      'is:weapon',
      SearchType.Item,
    );

    const searches = await getSearchesForProfile(client, platformMembershipId, 2);
    expect(searches.length).toBe(1);

    // Soft delete all searches
    await softDeleteAllSearches(client, platformMembershipId, 2);

    // Verify searches are soft deleted (usageCount = 0)
    const searchesAfter = await getSearchesForProfile(client, platformMembershipId, 2);
    expect(searchesAfter.length).toBe(0);

    // Now re-use the same search - this should succeed and not create a duplicate
    await updateUsedSearch(
      client,
      bungieMembershipId,
      platformMembershipId,
      2,
      'is:weapon',
      SearchType.Item,
    );

    const searchesAfter2 = await getSearchesForProfile(client, platformMembershipId, 2);
    expect(searchesAfter2.length).toBe(1);
    expect(searchesAfter2[0].query).toBe('is:weapon');
    expect(searchesAfter2[0].usageCount).toBe(1);
  });
});
