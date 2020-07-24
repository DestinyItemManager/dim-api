import { transaction, pool } from '.';
import {
  updateItemHashTag,
  getItemHashTagsForProfile,
  deleteAllItemHashTags,
  deleteItemHashTag,
} from './item-hash-tags-queries';

const appId = 'settings-queries-test-app';
const bungieMembershipId = 4321;

beforeEach(() =>
  transaction(async (client) => {
    await deleteAllItemHashTags(client, bungieMembershipId);
  })
);

afterAll(() => pool.end());

it('can insert item hash tags where none exist before', async () => {
  await transaction(async (client) => {
    await updateItemHashTag(client, appId, bungieMembershipId, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });

    const annotations = await getItemHashTagsForProfile(
      client,
      bungieMembershipId
    );
    expect(annotations[0]).toEqual({
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });
  });
});

it('can update item hash tags where none exist before', async () => {
  await transaction(async (client) => {
    await updateItemHashTag(client, appId, bungieMembershipId, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });

    await updateItemHashTag(client, appId, bungieMembershipId, {
      hash: 2926662838,
      tag: 'junk',
      notes: 'the worst',
    });

    const annotations = await getItemHashTagsForProfile(
      client,
      bungieMembershipId
    );
    expect(annotations[0]).toEqual({
      hash: 2926662838,
      tag: 'junk',
      notes: 'the worst',
    });
  });
});

it('can update item hash tags clearing value', async () => {
  await transaction(async (client) => {
    await updateItemHashTag(client, appId, bungieMembershipId, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });

    await updateItemHashTag(client, appId, bungieMembershipId, {
      hash: 2926662838,
      tag: null,
    });

    const annotations = await getItemHashTagsForProfile(
      client,
      bungieMembershipId
    );
    expect(annotations[0]).toEqual({
      hash: 2926662838,
      notes: 'the best',
    });
  });
});

it('can delete item hash tags', async () => {
  await transaction(async (client) => {
    await updateItemHashTag(client, appId, bungieMembershipId, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });

    await deleteItemHashTag(client, bungieMembershipId, 2926662838);

    const annotations = await getItemHashTagsForProfile(
      client,
      bungieMembershipId
    );
    expect(annotations).toEqual([]);
  });
});

it('can delete item hash tags by setting both values to null/empty', async () => {
  await transaction(async (client) => {
    await updateItemHashTag(client, appId, bungieMembershipId, {
      hash: 2926662838,
      tag: 'favorite',
      notes: 'the best',
    });

    await updateItemHashTag(client, appId, bungieMembershipId, {
      hash: 2926662838,
      tag: null,
      notes: '',
    });

    const annotations = await getItemHashTagsForProfile(
      client,
      bungieMembershipId
    );
    expect(annotations).toEqual([]);
  });
});
