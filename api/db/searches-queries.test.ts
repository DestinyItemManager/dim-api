import { transaction, pool } from '.';
import {
  deleteAllSearches,
  getSearchesForProfile,
  getSearchesForUser,
  updateUsedSearch,
  saveSearch,
  deleteSearch,
  importSearch,
} from './searches-queries';

const appId = 'settings-queries-test-app';
const bungieMembershipId = 4321;

beforeEach(() =>
  transaction(async (client) => {
    await deleteAllSearches(client, bungieMembershipId);
  })
);

afterAll(() => pool.end());

it('can record a used search where none was recorded before', async () => {
  await transaction(async (client) => {
    await updateUsedSearch(client, appId, bungieMembershipId, 2, 'tag:junk');

    const searches = (
      await getSearchesForProfile(client, bungieMembershipId, 2)
    ).filter((s) => s.usageCount > 0);
    expect(searches[0].query).toBe('tag:junk');
    expect(searches[0].saved).toBe(false);
    expect(searches[0].usageCount).toBe(1);
  });
});

it('can track search multiple times', async () => {
  await transaction(async (client) => {
    await updateUsedSearch(client, appId, bungieMembershipId, 2, 'tag:junk');
    await updateUsedSearch(client, appId, bungieMembershipId, 2, 'tag:junk');

    const searches = (
      await getSearchesForProfile(client, bungieMembershipId, 2)
    ).filter((s) => s.usageCount > 0);
    expect(searches[0].query).toBe('tag:junk');
    expect(searches[0].saved).toBe(false);
    expect(searches[0].usageCount).toBe(2);
  });
});

it('can mark a search as favorite', async () => {
  await transaction(async (client) => {
    await updateUsedSearch(client, appId, bungieMembershipId, 2, 'tag:junk');
    await saveSearch(client, appId, bungieMembershipId, 2, 'tag:junk', true);

    const searches = (
      await getSearchesForProfile(client, bungieMembershipId, 2)
    ).filter((s) => s.usageCount > 0);
    expect(searches[0].query).toBe('tag:junk');
    expect(searches[0].saved).toBe(true);
    expect(searches[0].usageCount).toBe(1);

    await saveSearch(client, appId, bungieMembershipId, 2, 'tag:junk', false);

    const searches2 = await getSearchesForProfile(
      client,
      bungieMembershipId,
      2
    );
    expect(searches2[0].query).toBe('tag:junk');
    expect(searches2[0].saved).toBe(false);
    // Save/unsave doesn't modify usage count
    expect(searches2[0].usageCount).toBe(1);
    expect(searches2[0].lastUsage).toBe(searches2[0].lastUsage);
  });
});
it('can mark a search as favorite even when it hasnt been used', async () => {
  await transaction(async (client) => {
    await saveSearch(client, appId, bungieMembershipId, 2, 'tag:junk', true);

    const searches = (
      await getSearchesForProfile(client, bungieMembershipId, 2)
    ).filter((s) => s.usageCount > 0);
    expect(searches[0].query).toBe('tag:junk');
    expect(searches[0].saved).toBe(true);
    expect(searches[0].usageCount).toBe(1);
  });
});

it('can get all searches across profiles', async () => {
  await transaction(async (client) => {
    await updateUsedSearch(client, appId, bungieMembershipId, 2, 'tag:junk');
    await updateUsedSearch(client, appId, bungieMembershipId, 1, 'is:tagged');

    const searches = await getSearchesForUser(client, bungieMembershipId);
    expect(searches.length).toEqual(2);
  });
});

it('can increment usage for one of the built-in searches', async () => {
  await transaction(async (client) => {
    const searches = await getSearchesForProfile(client, bungieMembershipId, 2);
    const query = searches[searches.length - 1].query;

    await updateUsedSearch(client, appId, bungieMembershipId, 2, query);

    const searches2 = await getSearchesForProfile(
      client,
      bungieMembershipId,
      2
    );
    const search = searches2.find((s) => s.query === query);
    expect(search?.usageCount).toBe(1);
    expect(searches2.length).toBe(searches.length);
  });
});

it('can delete a search', async () => {
  await transaction(async (client) => {
    await updateUsedSearch(client, appId, bungieMembershipId, 2, 'tag:junk');
    await deleteSearch(client, bungieMembershipId, 2, 'tag:junk');

    const searches = (
      await getSearchesForProfile(client, bungieMembershipId, 2)
    ).filter((s) => s.usageCount > 0);
    expect(searches.length).toBe(0);
  });
});

it('can import a search', async () => {
  await transaction(async (client) => {
    await importSearch(
      client,
      appId,
      bungieMembershipId,
      2,
      'tag:junk',
      true,
      1598199188576,
      5
    );

    const searches = (
      await getSearchesForProfile(client, bungieMembershipId, 2)
    ).filter((s) => s.usageCount > 0);
    expect(searches[0].query).toBe('tag:junk');
    expect(searches[0].saved).toBe(true);
    expect(searches[0].usageCount).toBe(5);
  });
});
