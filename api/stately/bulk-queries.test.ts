import { SearchType } from '../shapes/search.js';
import { deleteAllDataForUser, exportDataForUser } from './bulk-queries.js';
import { getItemAnnotationsForProfile, updateItemAnnotation } from './item-annotations-queries.js';
import { getItemHashTagsForProfile, updateItemHashTag } from './item-hash-tags-queries.js';
import { getLoadoutsForProfile, updateLoadout } from './loadouts-queries.js';
import { loadout } from './loadouts-queries.test.js';
import { getSearchesForProfile, updateUsedSearch } from './searches-queries.js';
import { getSettings, setSetting } from './settings-queries.js';
import { getTrackedTriumphsForProfile, trackTriumph } from './triumphs-queries.js';

const platformMembershipId = '213512057';
const bungieMembershipId = 4321;

beforeEach(async () => deleteAllDataForUser(bungieMembershipId, [platformMembershipId]));

describe('deleteAllDataForUser', () => {
  it('should delete all kinds of data', async () => {
    await updateItemAnnotation(platformMembershipId, 2, {
      id: '123456',
      tag: 'favorite',
      notes: 'the best',
    });
    await updateItemAnnotation(platformMembershipId, 1, {
      id: '1234567',
      tag: 'favorite',
      notes: 'the best??',
    });
    await updateItemHashTag(platformMembershipId, 2, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });
    await updateLoadout(platformMembershipId, 2, loadout);
    await updateUsedSearch(platformMembershipId, 1, 'is:handcannon', SearchType.Item);
    await updateUsedSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item);
    await trackTriumph(platformMembershipId, 3851137658);
    await setSetting(bungieMembershipId, {
      showNewItems: true,
    });

    await deleteAllDataForUser(bungieMembershipId, [platformMembershipId]);

    expect(await getItemAnnotationsForProfile(platformMembershipId, 2)).toEqual([]);
    expect(await getItemAnnotationsForProfile(platformMembershipId, 1)).toEqual([]);
    expect(await getItemHashTagsForProfile(platformMembershipId, 2)).toEqual([]);
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
    await updateItemAnnotation(platformMembershipId, 2, {
      id: '123456',
      tag: 'favorite',
      notes: 'the best',
    });
    await updateItemAnnotation(platformMembershipId, 1, {
      id: '1234567',
      tag: 'favorite',
      notes: 'the best??',
    });
    await updateItemHashTag(platformMembershipId, 2, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });
    await updateLoadout(platformMembershipId, 2, loadout);
    await updateUsedSearch(platformMembershipId, 1, 'is:handcannon', SearchType.Item);
    await updateUsedSearch(platformMembershipId, 2, 'tag:junk', SearchType.Item);
    await trackTriumph(platformMembershipId, 3851137658);
    await setSetting(bungieMembershipId, {
      showNewItems: true,
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
