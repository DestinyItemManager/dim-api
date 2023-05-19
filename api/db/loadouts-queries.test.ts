import { v4 as uuid } from 'uuid';
import { pool, transaction } from '.';
import { Loadout, LoadoutItem } from '../shapes/loadouts';
import { deleteLoadout, getLoadoutsForProfile, updateLoadout } from './loadouts-queries';

const appId = 'settings-queries-test-app';
const bungieMembershipId = 4321;
const platformMembershipId = '213512057';

beforeEach(() =>
  transaction(async (client) => {
    await client.query(`delete from loadouts where membership_id = ${bungieMembershipId}`);
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
    {
      hash: 200,
      id: '4567',
      craftedDate: 1000,
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

it('can record a loadout', async () => {
  await transaction(async (client) => {
    await updateLoadout(client, appId, bungieMembershipId, platformMembershipId, 2, loadout);

    const loadouts = await getLoadoutsForProfile(
      client,
      bungieMembershipId,
      platformMembershipId,
      2
    );

    expect(loadouts.length).toBe(1);

    const firstLoadout = loadouts[0];
    expect(firstLoadout.createdAt).toBeDefined();
    delete firstLoadout.createdAt;
    expect(firstLoadout.lastUpdatedAt).toBeDefined();
    delete firstLoadout.lastUpdatedAt;
    expect(firstLoadout.unequipped.length).toBe(1);
    expect(firstLoadout.unequipped[0]['fizbuzz'].not.toBeDefined());
    delete firstLoadout.unequipped[0]['fizbuzz'];
    expect(loadouts[0].id).toEqual(loadout.id);
  });
});

it('can update a loadout', async () => {
  await transaction(async (client) => {
    await updateLoadout(client, appId, bungieMembershipId, platformMembershipId, 2, loadout);

    await updateLoadout(client, appId, bungieMembershipId, platformMembershipId, 2, {
      ...loadout,
      name: 'Updated',
      unequipped: [],
    });

    const loadouts = await getLoadoutsForProfile(
      client,
      bungieMembershipId,
      platformMembershipId,
      2
    );

    expect(loadouts.length).toBe(1);
    expect(loadouts[0].name).toEqual('Updated');
    expect(loadouts[0].equipped.length).toBe(0);
    expect(loadouts[0].equipped).toEqual(loadout.equipped);
  });
});

it('can delete a loadout', async () => {
  await transaction(async (client) => {
    await updateLoadout(client, appId, bungieMembershipId, platformMembershipId, 2, loadout);

    await deleteLoadout(client, bungieMembershipId, loadout.id);

    const loadouts = await getLoadoutsForProfile(
      client,
      bungieMembershipId,
      platformMembershipId,
      2
    );

    expect(loadouts.length).toBe(0);
  });
});
