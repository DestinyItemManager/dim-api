import { omit } from 'es-toolkit';
import { defaultLoadoutParameters } from '../shapes/loadouts.js';
import { defaultSettings, Settings } from '../shapes/settings.js';
import { client } from './client.js';
import {
  convertToDimSettings,
  convertToStatelyItem,
  getSettings,
  setSetting,
} from './settings-queries.js';

const bungieMembershipId = 4321;

it('can roundtrip between DIM settings and Stately settings', () => {
  const settings: Settings = defaultSettings;
  const statelySettings = convertToStatelyItem(settings, 1234);
  const settings2 = convertToDimSettings(statelySettings);
  expect(omit(settings2, ['memberId' as keyof Settings])).toEqual(settings);
});

it('can roundtrip between DIM settings and Stately settings with loadout parameters', () => {
  const settings: Settings = { ...defaultSettings, loParameters: defaultLoadoutParameters };
  const statelySettings = convertToStatelyItem(settings, 1234);
  const settings2 = convertToDimSettings(statelySettings);
  expect(omit(settings2, ['memberId' as keyof Settings])).toEqual(settings);
});

it('can insert settings where none exist before', async () => {
  client.transaction(async (txn) => {
    await setSetting(txn, bungieMembershipId, {
      showNewItems: true,
    });
  });

  const settings = await getSettings(bungieMembershipId);
  expect(settings.showNewItems).toBe(true);
});

it('can update settings', async () => {
  client.transaction(async (txn) => {
    await setSetting(txn, bungieMembershipId, {
      showNewItems: true,
    });
  });

  const settings = await getSettings(bungieMembershipId);
  expect(settings.showNewItems).toBe(true);

  client.transaction(async (txn) => {
    await setSetting(txn, bungieMembershipId, {
      showNewItems: false,
    });
  });

  const settings2 = await getSettings(bungieMembershipId);
  expect(settings2.showNewItems).toBe(false);
});

it('can partially update settings', async () => {
  client.transaction(async (txn) => {
    await setSetting(txn, bungieMembershipId, {
      showNewItems: true,
    });
  });

  const settings = await getSettings(bungieMembershipId);
  expect(settings.showNewItems).toBe(true);

  client.transaction(async (txn) => {
    await setSetting(txn, bungieMembershipId, {
      singleCharacter: true,
    });
  });

  const settings2 = await getSettings(bungieMembershipId);
  expect(settings2.showNewItems).toBe(true);
});
