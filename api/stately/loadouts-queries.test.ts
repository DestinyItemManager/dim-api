import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import { Loadout } from '../shapes/loadouts.js';
import {
  convertLoadoutFromStately,
  convertLoadoutToStately,
  deleteAllLoadouts,
  deleteLoadout,
  getLoadoutsForProfile,
  updateLoadout,
} from './loadouts-queries.js';

const platformMembershipId = '213512057';

beforeEach(async () => deleteAllLoadouts(platformMembershipId));

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
    {
      hash: 200,
      id: '5678',
      amount: 10,
    },
  ],
};

it('can roundtrip between DIM loadout and Stately loadout', () => {
  const statelyLoadout = convertLoadoutToStately(loadout, platformMembershipId, 2);
  const loadout2 = convertLoadoutFromStately(statelyLoadout);
  expect(_.omit(loadout2, 'profileId', 'destinyVersion', 'createdAt', 'lastUpdatedAt')).toEqual(
    loadout,
  );
});

it('can record a loadout', async () => {
  await updateLoadout(platformMembershipId, 2, loadout);

  const loadouts = await getLoadoutsForProfile(platformMembershipId, 2);

  expect(loadouts.length).toBe(1);

  const firstLoadout = loadouts[0];
  expect(firstLoadout.createdAt).toBeDefined();
  delete firstLoadout.createdAt;
  expect(firstLoadout.lastUpdatedAt).toBeDefined();
  delete firstLoadout.lastUpdatedAt;
  expect(firstLoadout.unequipped.length).toBe(1);
  expect(firstLoadout).toEqual(loadout);
});

it('can update a loadout', async () => {
  await updateLoadout(platformMembershipId, 2, loadout);

  await updateLoadout(platformMembershipId, 2, {
    ...loadout,
    name: 'Updated',
    unequipped: [],
  });

  const loadouts = await getLoadoutsForProfile(platformMembershipId, 2);

  expect(loadouts.length).toBe(1);
  expect(loadouts[0].name).toEqual('Updated');
  expect(loadouts[0].unequipped.length).toBe(0);
  expect(loadouts[0].equipped).toEqual(loadout.equipped);
});

it('can delete a loadout', async () => {
  await updateLoadout(platformMembershipId, 2, loadout);
  let loadouts = await getLoadoutsForProfile(platformMembershipId, 2);
  expect(loadouts.length).toBe(1);

  await deleteLoadout(platformMembershipId, 2, loadout.id);
  loadouts = await getLoadoutsForProfile(platformMembershipId, 2);
  expect(loadouts.length).toBe(0);
});
