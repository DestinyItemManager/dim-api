import { pool, transaction } from '.';
import { TagVariant } from '../shapes/item-annotations';
import {
  deleteAllItemAnnotations,
  deleteItemAnnotation,
  deleteItemAnnotationList,
  getItemAnnotationsForProfile,
  updateItemAnnotation,
} from './item-annotations-queries';

const appId = 'settings-queries-test-app';
const platformMembershipId = '213512057';
const bungieMembershipId = 4321;

beforeEach(() =>
  transaction(async (client) => {
    await deleteAllItemAnnotations(client, bungieMembershipId);
  })
);

afterAll(() => pool.end());

it('can insert tags where none exist before', async () => {
  await transaction(async (client) => {
    await updateItemAnnotation(client, appId, bungieMembershipId, platformMembershipId, 2, {
      id: '123456',
      tag: 'favorite',
      notes: 'the best',
    });

    const annotations = await getItemAnnotationsForProfile(
      client,
      bungieMembershipId,
      platformMembershipId,
      2
    );
    expect(annotations[0]).toEqual({
      id: '123456',
      tag: 'favorite',
      notes: 'the best',
    });
  });
});

it('can update tags where none exist before', async () => {
  await transaction(async (client) => {
    await updateItemAnnotation(client, appId, bungieMembershipId, platformMembershipId, 2, {
      id: '123456',
      tag: 'favorite',
      notes: 'the best',
    });

    await updateItemAnnotation(client, appId, bungieMembershipId, platformMembershipId, 2, {
      id: '123456',
      tag: 'junk',
      notes: 'the worst',
    });

    const annotations = await getItemAnnotationsForProfile(
      client,
      bungieMembershipId,
      platformMembershipId,
      2
    );
    expect(annotations[0]).toEqual({
      id: '123456',
      tag: 'junk',
      notes: 'the worst',
    });
  });
});

it('can update tags clearing value', async () => {
  await transaction(async (client) => {
    await updateItemAnnotation(client, appId, bungieMembershipId, platformMembershipId, 2, {
      id: '123456',
      tag: 'favorite',
      notes: 'the best',
    });

    await updateItemAnnotation(client, appId, bungieMembershipId, platformMembershipId, 2, {
      id: '123456',
      tag: null,
    });

    const annotations = await getItemAnnotationsForProfile(
      client,
      bungieMembershipId,
      platformMembershipId,
      2
    );
    expect(annotations[0]).toEqual({
      id: '123456',
      notes: 'the best',
    });
  });
});

it('can delete tags', async () => {
  await transaction(async (client) => {
    await updateItemAnnotation(client, appId, bungieMembershipId, platformMembershipId, 2, {
      id: '123456',
      tag: 'favorite',
      notes: 'the best',
    });

    await deleteItemAnnotation(client, bungieMembershipId, '123456');

    const annotations = await getItemAnnotationsForProfile(
      client,
      bungieMembershipId,
      platformMembershipId,
      2
    );
    expect(annotations).toEqual([]);
  });
});

it('can delete tags by setting both values to null/empty', async () => {
  await transaction(async (client) => {
    await updateItemAnnotation(client, appId, bungieMembershipId, platformMembershipId, 2, {
      id: '123456',
      tag: 'favorite',
      notes: 'the best',
    });

    await updateItemAnnotation(client, appId, bungieMembershipId, platformMembershipId, 2, {
      id: '123456',
      tag: null,
      notes: '',
    });

    const annotations = await getItemAnnotationsForProfile(
      client,
      bungieMembershipId,
      platformMembershipId,
      2
    );
    expect(annotations).toEqual([]);
  });
});

it('can insert tags with a variant', async () => {
  await transaction(async (client) => {
    await updateItemAnnotation(client, appId, bungieMembershipId, platformMembershipId, 2, {
      id: '123456',
      tag: 'keep',
      v: TagVariant.PVP,
    });

    const annotations = await getItemAnnotationsForProfile(
      client,
      bungieMembershipId,
      platformMembershipId,
      2
    );
    expect(annotations[0]).toEqual({
      id: '123456',
      tag: 'keep',
      v: TagVariant.PVP,
    });

    // And updating notes doesn't mess with that:
    await updateItemAnnotation(client, appId, bungieMembershipId, platformMembershipId, 2, {
      id: '123456',
      notes: 'pretty cool',
    });

    const annotations2 = await getItemAnnotationsForProfile(
      client,
      bungieMembershipId,
      platformMembershipId,
      2
    );
    expect(annotations2[0]).toEqual({
      id: '123456',
      tag: 'keep',
      v: TagVariant.PVP,
      notes: 'pretty cool',
    });
  });
});

it('can clear tags', async () => {
  await transaction(async (client) => {
    await updateItemAnnotation(client, appId, bungieMembershipId, platformMembershipId, 2, {
      id: '123456',
      tag: 'favorite',
      notes: 'the best',
    });
    await updateItemAnnotation(client, appId, bungieMembershipId, platformMembershipId, 2, {
      id: '654321',
      tag: 'junk',
      notes: 'the worst',
    });

    await deleteItemAnnotationList(client, bungieMembershipId, ['123456', '654321']);

    const annotations = await getItemAnnotationsForProfile(
      client,
      bungieMembershipId,
      platformMembershipId,
      2
    );
    expect(annotations).toEqual([]);
  });
});
