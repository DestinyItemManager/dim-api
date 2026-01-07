import { v4 as uuid } from 'uuid';
import { Loadout, LoadoutItem } from '../shapes/loadouts.js';
import { closeDbPool, transaction } from './index.js';
import { deleteLoadout, getLoadoutsForProfile, updateLoadout } from './loadouts-queries.js';

const bungieMembershipId = 4321;
const platformMembershipId = '213512057';

beforeEach(() =>
  transaction(async (client) => {
    await client.query(`delete from loadouts where membership_id = ${bungieMembershipId}`);
  }),
);

afterAll(async () => closeDbPool());

const loadout: Loadout = {
  id: uuid(),
  name: 'Test Loadout',
  classType: 1,
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
    await updateLoadout(client, bungieMembershipId, platformMembershipId, 2, loadout);

    const loadouts = await getLoadoutsForProfile(client, platformMembershipId, 2);

    expect(loadouts.length).toBe(1);

    const firstLoadout = loadouts[0];
    expect(firstLoadout.createdAt).toBeDefined();
    delete firstLoadout.createdAt;
    expect(firstLoadout.lastUpdatedAt).toBeDefined();
    delete firstLoadout.lastUpdatedAt;
    expect(firstLoadout.unequipped.length).toBe(1);
    expect((firstLoadout.unequipped[0] as { fizbuzz?: number }).fizbuzz).toBeUndefined();
    (firstLoadout.unequipped[0] as { fizbuzz?: number }).fizbuzz = 11;
    expect(firstLoadout).toEqual(loadout);
  });
});

it('can update a loadout', async () => {
  await transaction(async (client) => {
    await updateLoadout(client, bungieMembershipId, platformMembershipId, 2, loadout);

    await updateLoadout(client, bungieMembershipId, platformMembershipId, 2, {
      ...loadout,
      name: 'Updated',
      unequipped: [],
    });

    const loadouts = await getLoadoutsForProfile(client, platformMembershipId, 2);

    expect(loadouts.length).toBe(1);
    expect(loadouts[0].name).toEqual('Updated');
    expect(loadouts[0].unequipped.length).toBe(0);
    expect(loadouts[0].equipped).toEqual(loadout.equipped);
  });
});

it('can delete a loadout', async () => {
  await transaction(async (client) => {
    await updateLoadout(client, bungieMembershipId, platformMembershipId, 2, loadout);

    const success = await deleteLoadout(client, platformMembershipId, loadout.id);
    expect(success).toBe(true);

    const loadouts = await getLoadoutsForProfile(client, platformMembershipId, 2);

    expect(loadouts.length).toBe(0);
  });
});
