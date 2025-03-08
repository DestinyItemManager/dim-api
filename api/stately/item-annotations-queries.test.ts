import { client } from './client.js';
import {
  deleteAllItemAnnotations,
  deleteItemAnnotation,
  getItemAnnotationsForProfile,
  updateItemAnnotation,
} from './item-annotations-queries.js';

const platformMembershipId = '213512057';

beforeEach(async () => deleteAllItemAnnotations(platformMembershipId));

it('can insert tags where none exist before', async () => {
  await client.transaction(async (txn) => {
    await updateItemAnnotation(txn, platformMembershipId, 2, [
      {
        id: '123456',
        tag: 'favorite',
        notes: 'the best',
      },
    ]);
  });

  const annotations = (await getItemAnnotationsForProfile(platformMembershipId, 2)).tags;
  expect(annotations[0]).toEqual({
    id: '123456',
    tag: 'favorite',
    notes: 'the best',
  });
});

it('can update tags where none exist before', async () => {
  await client.transaction(async (txn) => {
    await updateItemAnnotation(txn, platformMembershipId, 2, [
      {
        id: '123456',
        tag: 'favorite',
        notes: 'the best',
      },
      {
        id: '123456',
        tag: 'junk',
        notes: 'the worst',
      },
    ]);
  });

  const annotations = (await getItemAnnotationsForProfile(platformMembershipId, 2)).tags;
  expect(annotations[0]).toEqual({
    id: '123456',
    tag: 'junk',
    notes: 'the worst',
  });
});

it('can update tags clearing value', async () => {
  await client.transaction(async (txn) => {
    await updateItemAnnotation(txn, platformMembershipId, 2, [
      {
        id: '123456',
        tag: 'favorite',
        notes: 'the best',
      },
    ]);
  });
  await client.transaction(async (txn) => {
    await updateItemAnnotation(txn, platformMembershipId, 2, [
      {
        id: '123456',
        tag: null,
      },
    ]);
  });

  const annotations = (await getItemAnnotationsForProfile(platformMembershipId, 2)).tags;
  expect(annotations[0]).toEqual({
    id: '123456',
    notes: 'the best',
  });
});

it('can create tags while passing null notes', async () => {
  await client.transaction(async (txn) => {
    await updateItemAnnotation(txn, platformMembershipId, 2, [
      {
        id: '123456',
        tag: 'favorite',
        notes: null,
      },
    ]);
  });

  const annotations = (await getItemAnnotationsForProfile(platformMembershipId, 2)).tags;
  expect(annotations[0]).toEqual({
    id: '123456',
    tag: 'favorite',
  });
});

it('can delete tags', async () => {
  await client.transaction(async (txn) => {
    await updateItemAnnotation(txn, platformMembershipId, 2, [
      {
        id: '123456',
        tag: 'favorite',
        notes: 'the best',
      },
    ]);
  });
  await client.transaction(async (txn) => {
    await deleteItemAnnotation(txn, platformMembershipId, 2, ['123456']);
  });

  const annotations = (await getItemAnnotationsForProfile(platformMembershipId, 2)).tags;
  expect(annotations).toEqual([]);
});

it('can delete tags by setting both values to null/empty', async () => {
  await client.transaction(async (txn) => {
    await updateItemAnnotation(txn, platformMembershipId, 2, [
      {
        id: '123456',
        tag: 'favorite',
        notes: 'the best',
      },
    ]);
  });
  await client.transaction(async (txn) => {
    await updateItemAnnotation(txn, platformMembershipId, 2, [
      {
        id: '123456',
        tag: null,
        notes: '',
      },
    ]);
  });

  const annotations = (await getItemAnnotationsForProfile(platformMembershipId, 2)).tags;
  expect(annotations).toEqual([]);
});

it('can clear tags', async () => {
  await client.transaction(async (txn) => {
    await updateItemAnnotation(txn, platformMembershipId, 2, [
      {
        id: '123456',
        tag: 'favorite',
        notes: 'the best',
      },
    ]);
  });
  await client.transaction(async (txn) => {
    await deleteItemAnnotation(txn, platformMembershipId, 2, ['123456', '654321']);
  });

  const annotations = (await getItemAnnotationsForProfile(platformMembershipId, 2)).tags;
  expect(annotations).toEqual([]);
});
