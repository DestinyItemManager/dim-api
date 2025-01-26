import { toBinary } from '@bufbuild/protobuf';
import { omit } from 'es-toolkit';
import { v4 as uuid } from 'uuid';
import { defaultLoadoutParameters, Loadout, LoadoutParameters } from '../shapes/loadouts.js';
import { client } from './client.js';
import { LoadoutParametersSchema, LoadoutSchema } from './generated/index.js';
import {
  convertLoadoutFromStately,
  convertLoadoutParametersFromStately,
  convertLoadoutParametersToStately,
  convertLoadoutToStately,
  deleteAllLoadouts,
  deleteLoadout,
  getLoadoutsForProfile,
  updateLoadout,
} from './loadouts-queries.js';

const platformMembershipId = '213512057';

beforeEach(async () => deleteAllLoadouts(platformMembershipId));

export const loadout: Loadout = {
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
  expect(() => toBinary(LoadoutSchema, statelyLoadout)).not.toThrow();
  const loadout2 = convertLoadoutFromStately(statelyLoadout);
  expect(
    omit(loadout2, [
      'profileId' as keyof Loadout,
      'destinyVersion' as keyof Loadout,
      'createdAt',
      'lastUpdatedAt',
    ]),
  ).toEqual(loadout);
});

it('can roundtrip loadout parameters', () => {
  const loParams: LoadoutParameters = {
    ...defaultLoadoutParameters,
    exoticArmorHash: 3045642045,
    autoStatMods: false,
    clearArmor: true,
    clearMods: true,
    clearWeapons: true,
  };

  const statelyLoParams = client.create(
    'LoadoutParameters',
    convertLoadoutParametersToStately(loParams),
  );
  expect(() => toBinary(LoadoutParametersSchema, statelyLoParams)).not.toThrow();
  const loParams2 = convertLoadoutParametersFromStately(statelyLoParams);
  expect(loParams2).toEqual(loParams);
});

it('can roundtrip loadout parameters w/ a negative armor hash', () => {
  const loParams: LoadoutParameters = {
    ...defaultLoadoutParameters,
    exoticArmorHash: -1,
    clearArmor: true,
    clearMods: true,
    clearWeapons: true,
  };

  const statelyLoParams = client.create(
    'LoadoutParameters',
    convertLoadoutParametersToStately(loParams),
  );
  expect(() => toBinary(LoadoutParametersSchema, statelyLoParams)).not.toThrow();
  const loParams2 = convertLoadoutParametersFromStately(statelyLoParams);
  expect(loParams2).toEqual(loParams);
});

it('can record a loadout', async () => {
  await client.transaction(async (txn) => {
    await updateLoadout(txn, platformMembershipId, 2, [loadout]);
  });

  const loadouts = (await getLoadoutsForProfile(platformMembershipId, 2)).loadouts;

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
  await client.transaction(async (txn) => {
    await updateLoadout(txn, platformMembershipId, 2, [loadout]);
  });

  await client.transaction(async (txn) => {
    await updateLoadout(txn, platformMembershipId, 2, [
      {
        ...loadout,
        name: 'Updated',
        unequipped: [],
      },
    ]);
  });

  const loadouts = (await getLoadoutsForProfile(platformMembershipId, 2)).loadouts;

  expect(loadouts.length).toBe(1);
  expect(loadouts[0].name).toEqual('Updated');
  expect(loadouts[0].unequipped.length).toBe(0);
  expect(loadouts[0].equipped).toEqual(loadout.equipped);
});

it('can delete a loadout', async () => {
  await client.transaction(async (txn) => {
    await updateLoadout(txn, platformMembershipId, 2, [loadout]);
  });
  let loadouts = (await getLoadoutsForProfile(platformMembershipId, 2)).loadouts;
  expect(loadouts.length).toBe(1);

  await client.transaction(async (txn) => {
    await deleteLoadout(txn, platformMembershipId, 2, [loadout.id]);
  });
  loadouts = (await getLoadoutsForProfile(platformMembershipId, 2)).loadouts;
  expect(loadouts.length).toBe(0);
});
