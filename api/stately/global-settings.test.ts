import { getGlobalSettings, updateGlobalSettings } from './global-settings.js';

it('can retrieve GlobalSettings', async () => {
  await updateGlobalSettings({
    stage: 'dev',
    dimApiEnabled: true,
    destinyProfileMinimumRefreshInterval: 15n,
    destinyProfileRefreshInterval: 120n,
    autoRefresh: true,
    refreshProfileOnVisible: true,
    dimProfileMinimumRefreshInterval: 600n,
    showIssueBanner: false,
  });

  const settings = await getGlobalSettings('dev');
  expect(settings).toEqual({
    stage: 'dev',
    dimApiEnabled: true,
    destinyProfileMinimumRefreshInterval: 15,
    destinyProfileRefreshInterval: 120,
    autoRefresh: true,
    refreshProfileOnVisible: true,
    dimProfileMinimumRefreshInterval: 600,
    showIssueBanner: false,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    lastUpdated: expect.any(Number),
  });
});

it('returns undefined for missing GlobalSettings', async () => {
  const missingSettings = await getGlobalSettings('foo');
  expect(missingSettings).toBeUndefined();
});
