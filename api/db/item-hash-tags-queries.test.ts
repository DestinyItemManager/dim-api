import { closeDbPool, transaction } from './index.js';
import {
  deleteAllItemHashTags,
  deleteItemHashTag,
  getItemHashTagsForProfile,
  updateItemHashTag,
} from './item-hash-tags-queries.js';

const bungieMembershipId = 4321;
const platformMembershipId = '213512057';

beforeEach(() =>
  transaction(async (client) => {
    await deleteAllItemHashTags(client, platformMembershipId);
  }),
);

afterAll(async () => closeDbPool());

it('can insert item hash tags where none exist before', async () => {
  await transaction(async (client) => {
    await updateItemHashTag(client, bungieMembershipId, platformMembershipId, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });

    const annotations = await getItemHashTagsForProfile(client, platformMembershipId);
    expect(annotations[0]).toEqual({
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });
  });
});

it('can update item hash tags where none exist before', async () => {
  await transaction(async (client) => {
    await updateItemHashTag(client, bungieMembershipId, platformMembershipId, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });

    await updateItemHashTag(client, bungieMembershipId, platformMembershipId, {
      hash: 2926662838,
      tag: 'junk',
      notes: 'the worst',
    });

    const annotations = await getItemHashTagsForProfile(client, platformMembershipId);
    expect(annotations[0]).toEqual({
      hash: 2926662838,
      tag: 'junk',
      notes: 'the worst',
    });
  });
});

it('can update item hash tags clearing value', async () => {
  await transaction(async (client) => {
    await updateItemHashTag(client, bungieMembershipId, platformMembershipId, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });

    await updateItemHashTag(client, bungieMembershipId, platformMembershipId, {
      hash: 2926662838,
      tag: null,
    });

    const annotations = await getItemHashTagsForProfile(client, platformMembershipId);
    expect(annotations[0]).toEqual({
      hash: 2926662838,
      notes: 'the best',
    });
  });
});

it('can delete item hash tags', async () => {
  await transaction(async (client) => {
    await updateItemHashTag(client, bungieMembershipId, platformMembershipId, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });

    await deleteItemHashTag(client, platformMembershipId, 2926662838);

    const annotations = await getItemHashTagsForProfile(client, platformMembershipId);
    expect(annotations).toEqual([]);
  });
});

it('can delete item hash tags by setting both values to null/empty', async () => {
  await transaction(async (client) => {
    await updateItemHashTag(client, bungieMembershipId, platformMembershipId, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });

    await updateItemHashTag(client, bungieMembershipId, platformMembershipId, {
      hash: 2926662838,
      tag: null,
      notes: '',
    });

    const annotations = await getItemHashTagsForProfile(client, platformMembershipId);
    expect(annotations).toEqual([]);
  });
});
