import { client } from './client.js';
import {
  deleteAllItemHashTags,
  deleteItemHashTag,
  getItemHashTagsForProfile,
  updateItemHashTag,
} from './item-hash-tags-queries.js';

const platformMembershipId = '213512057';

beforeEach(async () => deleteAllItemHashTags(platformMembershipId));

it('can insert item hash tags where none exist before', async () => {
  await client.transaction(async (txn) => {
    await updateItemHashTag(txn, platformMembershipId, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });
  });

  const annotations = await getItemHashTagsForProfile(platformMembershipId);
  expect(annotations[0]).toEqual({
    hash: 2926662838,
    tag: 'favorite',
    notes: 'the best',
  });
});

it('can update item hash tags where none exist before', async () => {
  await client.transaction(async (txn) => {
    await updateItemHashTag(txn, platformMembershipId, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });

    await updateItemHashTag(txn, platformMembershipId, {
      hash: 2926662838,
      tag: 'junk',
      notes: 'the worst',
    });
  });

  const annotations = await getItemHashTagsForProfile(platformMembershipId);
  expect(annotations[0]).toEqual({
    hash: 2926662838,
    tag: 'junk',
    notes: 'the worst',
  });
});

it('can update item hash tags clearing value', async () => {
  await client.transaction(async (txn) => {
    await updateItemHashTag(txn, platformMembershipId, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });
  });
  await client.transaction(async (txn) => {
    await updateItemHashTag(txn, platformMembershipId, {
      hash: 2926662838,
      tag: null,
    });
  });
  const annotations = await getItemHashTagsForProfile(platformMembershipId);
  expect(annotations[0]).toEqual({
    hash: 2926662838,
    notes: 'the best',
  });
});

it('can delete item hash tags', async () => {
  await client.transaction(async (txn) => {
    await updateItemHashTag(txn, platformMembershipId, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });
  });

  await client.transaction(async (txn) => {
    await deleteItemHashTag(txn, platformMembershipId, 2926662838);
  });

  const annotations = await getItemHashTagsForProfile(platformMembershipId);
  expect(annotations).toEqual([]);
});

it('can delete item hash tags by setting both values to null/empty', async () => {
  await client.transaction(async (txn) => {
    await updateItemHashTag(txn, platformMembershipId, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });
  });

  await client.transaction(async (txn) => {
    await updateItemHashTag(txn, platformMembershipId, {
      hash: 2926662838,
      tag: null,
      notes: '',
    });
  });

  const annotations = await getItemHashTagsForProfile(platformMembershipId);
  expect(annotations).toEqual([]);
});
