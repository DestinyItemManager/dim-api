import { SearchType } from '../shapes/search.js';
import { deleteAllDataForUser, exportDataForUser } from './bulk-queries.js';
import { client } from './client.js';
import { getItemAnnotationsForProfile, updateItemAnnotation } from './item-annotations-queries.js';
import { getItemHashTagsForProfile, updateItemHashTag } from './item-hash-tags-queries.js';
import { getLoadoutsForProfile, updateLoadout } from './loadouts-queries.js';
import { loadout } from './loadouts-queries.test.js';
import { getSearchesForProfile, updateSearches } from './searches-queries.js';
import { getSettings, setSetting } from './settings-queries.js';
import { getTrackedTriumphsForProfile, trackUntrackTriumphs } from './triumphs-queries.js';

const platformMembershipId = '213512057';
const bungieMembershipId = 4321;

beforeEach(async () => deleteAllDataForUser(bungieMembershipId, [platformMembershipId]));

describe('deleteAllDataForUser', () => {
  it('should delete all kinds of data', async () => {
    client.transaction(async (txn) => {
      await updateItemAnnotation(txn, platformMembershipId, 2, [
        {
          id: '123456',
          tag: 'favorite',
          notes: 'the best',
        },
      ]);
      await updateItemAnnotation(txn, platformMembershipId, 1, [
        {
          id: '1234567',
          tag: 'favorite',
          notes: 'the best??',
        },
      ]);
      await updateItemHashTag(txn, platformMembershipId, {
        hash: 2926662838,
        tag: 'favorite',
        notes: 'the best',
      });
      await updateLoadout(txn, platformMembershipId, 2, [loadout]);
      await updateSearches(txn, platformMembershipId, 1, [
        { query: 'is:handcannon', type: SearchType.Item, incrementUsed: 1, saved: false },
      ]);
      await updateSearches(txn, platformMembershipId, 2, [
        { query: 'tag:junk', type: SearchType.Item, incrementUsed: 1, saved: false },
      ]);
      await trackUntrackTriumphs(txn, platformMembershipId, [
        { recordHash: 3851137658, tracked: true },
      ]);
      await setSetting(txn, bungieMembershipId, {
        showNewItems: true,
      });
    });

    await deleteAllDataForUser(bungieMembershipId, [platformMembershipId]);

    expect(await getItemAnnotationsForProfile(platformMembershipId, 2)).toEqual([]);
    expect(await getItemAnnotationsForProfile(platformMembershipId, 1)).toEqual([]);
    expect(await getItemHashTagsForProfile(platformMembershipId)).toEqual([]);
    expect(await getLoadoutsForProfile(platformMembershipId, 2)).toEqual([]);
    expect(
      (await getSearchesForProfile(platformMembershipId, 1)).filter((s) => s.usageCount > 0),
    ).toEqual([]);
    expect(
      (await getSearchesForProfile(platformMembershipId, 2)).filter((s) => s.usageCount > 0),
    ).toEqual([]);
    expect(await getTrackedTriumphsForProfile(platformMembershipId)).toEqual([]);
    expect((await getSettings(bungieMembershipId)).showNewItems).toBe(false);
  });
});

describe('exportDataForUser', () => {
  it('should delete all kinds of data', async () => {
    client.transaction(async (txn) => {
      await updateItemAnnotation(txn, platformMembershipId, 2, [
        {
          id: '123456',
          tag: 'favorite',
          notes: 'the best',
        },
      ]);
      await updateItemAnnotation(txn, platformMembershipId, 1, [
        {
          id: '1234567',
          tag: 'favorite',
          notes: 'the best??',
        },
      ]);
      await updateItemHashTag(txn, platformMembershipId, {
        hash: 2926662838,
        tag: 'favorite',
        notes: 'the best',
      });
      await updateLoadout(txn, platformMembershipId, 2, [loadout]);
      await updateSearches(txn, platformMembershipId, 1, [
        { query: 'is:handcannon', type: SearchType.Item, incrementUsed: 1, saved: false },
      ]);
      await updateSearches(txn, platformMembershipId, 2, [
        { query: 'tag:junk', type: SearchType.Item, incrementUsed: 1, saved: false },
      ]);
      await trackUntrackTriumphs(txn, platformMembershipId, [
        { recordHash: 3851137658, tracked: true },
      ]);
      await setSetting(txn, bungieMembershipId, {
        showNewItems: true,
      });
    });

    const exportResponse = await exportDataForUser(bungieMembershipId, [platformMembershipId]);

    expect(exportResponse.settings.showNewItems).toBe(true);
    expect(exportResponse.tags.length).toBe(2);
    expect(exportResponse.itemHashTags.length).toBe(1);
    expect(exportResponse.loadouts.length).toBe(1);
    expect(exportResponse.searches.length).toBe(2);
    expect(exportResponse.triumphs[0]?.triumphs.length).toBe(1);
  });
});
