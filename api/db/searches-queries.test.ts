import { transaction, pool } from '.';
import {
  deleteAllSearches,
  getSearchesForProfile,
  getSearchesForUser,
  updateUsedSearch,
  saveSearch,
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

    const searches = await getSearchesForProfile(client, bungieMembershipId, 2);
    expect(searches[0].query).toBe('tag:junk');
    expect(searches[0].saved).toBe(false);
    expect(searches[0].usageCount).toBe(1);
  });
});

it('can track search multiple times', async () => {
  await transaction(async (client) => {
    await updateUsedSearch(client, appId, bungieMembershipId, 2, 'tag:junk');
    await updateUsedSearch(client, appId, bungieMembershipId, 2, 'tag:junk');

    const searches = await getSearchesForProfile(client, bungieMembershipId, 2);
    expect(searches[0].query).toBe('tag:junk');
    expect(searches[0].saved).toBe(false);
    expect(searches[0].usageCount).toBe(2);
  });
});

it('can mark a search as favorite', async () => {
  await transaction(async (client) => {
    await updateUsedSearch(client, appId, bungieMembershipId, 2, 'tag:junk');
    await saveSearch(client, appId, bungieMembershipId, 2, 'tag:junk', true);

    const searches = await getSearchesForProfile(client, bungieMembershipId, 2);
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
it('can get all searches across profiles', async () => {
  await transaction(async (client) => {
    await updateUsedSearch(client, appId, bungieMembershipId, 2, 'tag:junk');
    await updateUsedSearch(client, appId, bungieMembershipId, 1, 'is:tagged');

    const searches = await getSearchesForUser(client, bungieMembershipId);
    expect(searches.length).toEqual(2);
  });
});
