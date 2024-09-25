import _ from 'lodash';
import { defaultLoadoutParameters } from '../shapes/loadouts.js';
import { defaultSettings, Settings } from '../shapes/settings.js';
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
  expect(_.omit(settings2, 'memberId')).toEqual(settings);
});

it('can roundtrip between DIM settings and Stately settings with loadout parameters', () => {
  const settings: Settings = { ...defaultSettings, loParameters: defaultLoadoutParameters };
  const statelySettings = convertToStatelyItem(settings, 1234);
  const settings2 = convertToDimSettings(statelySettings);
  expect(_.omit(settings2, 'memberId')).toEqual(settings);
});

it('can insert settings where none exist before', async () => {
  await setSetting(bungieMembershipId, {
    showNewItems: true,
  });

  const settings = await getSettings(bungieMembershipId);
  expect(settings.showNewItems).toBe(true);
});

it('can update settings', async () => {
  await setSetting(bungieMembershipId, {
    showNewItems: true,
  });

  const settings = await getSettings(bungieMembershipId);
  expect(settings.showNewItems).toBe(true);

  await setSetting(bungieMembershipId, {
    showNewItems: false,
  });

  const settings2 = await getSettings(bungieMembershipId);
  expect(settings2.showNewItems).toBe(false);
});

it('can partially update settings', async () => {
  await setSetting(bungieMembershipId, {
    showNewItems: true,
  });

  const settings = await getSettings(bungieMembershipId);
  expect(settings.showNewItems).toBe(true);

  await setSetting(bungieMembershipId, {
    singleCharacter: true,
  });

  const settings2 = await getSettings(bungieMembershipId);
  expect(settings2.showNewItems).toBe(true);
});
