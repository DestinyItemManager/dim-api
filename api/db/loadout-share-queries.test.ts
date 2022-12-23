import { v4 as uuid } from 'uuid';
import { pool, transaction } from '.';
import { Loadout, LoadoutItem } from '../shapes/loadouts';
import {
  addLoadoutShare,
  getLoadoutShare,
  recordAccess,
} from './loadout-share-queries';

const appId = 'settings-queries-test-app';
const bungieMembershipId = 4321;
const platformMembershipId = '213512057';

const shareID = 'ABCDEFG';

beforeEach(() =>
  transaction(async (client) => {
    await client.query("delete from loadout_shares where id = 'ABCDEFG'");
  })
);

afterAll(() => pool.end());

const loadout: Loadout = {
  id: uuid(),
  name: 'Test Loadout',
  classType: 1,
  clearSpace: false,
  equipped: [
    {
      hash: 100,
      id: '1234',
      socketOverrides: { 7: 9 },
    },
  ],
  unequipped: [
    // This item has an extra property which shouldn't be saved
    {
      hash: 200,
      id: '5678',
      amount: 10,
      fizbuzz: 11,
    } as any as LoadoutItem,
  ],
};

it('can record a shared loadout', async () => {
  await transaction(async (client) => {
    await addLoadoutShare(
      client,
      appId,
      bungieMembershipId,
      platformMembershipId,
      shareID,
      loadout
    );

    const sharedLoadout = await getLoadoutShare(client, shareID);

    expect(sharedLoadout?.name).toBe(loadout.name);
  });
});

it('rejects multiple shares with the same ID', async () => {
  await transaction(async (client) => {
    await addLoadoutShare(
      client,
      appId,
      bungieMembershipId,
      platformMembershipId,
      shareID,
      loadout
    );

    try {
      await addLoadoutShare(
        client,
        appId,
        bungieMembershipId,
        platformMembershipId,
        shareID,
        loadout
      );
      fail('Expected this to throw an error');
    } catch (e) {}
  });
});

it('can record visits', async () => {
  await transaction(async (client) => {
    await addLoadoutShare(
      client,
      appId,
      bungieMembershipId,
      platformMembershipId,
      shareID,
      loadout
    );

    await recordAccess(client, shareID);
  });
});
