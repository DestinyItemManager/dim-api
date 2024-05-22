import { closeDbPool, transaction } from './index.js';
import { getSettings, setSetting } from './settings-queries.js';

const appId = 'settings-queries-test-app';
const bungieMembershipId = 4321;

afterAll(() => closeDbPool());

it('can insert settings where none exist before', async () => {
  await transaction(async (client) => {
    await setSetting(client, appId, bungieMembershipId, {
      showNewItems: true,
    });

    const settings = await getSettings(client, bungieMembershipId);
    expect(settings.showNewItems).toBe(true);
  });
});

it('can update settings', async () => {
  await transaction(async (client) => {
    await setSetting(client, appId, bungieMembershipId, {
      showNewItems: true,
    });

    const settings = await getSettings(client, bungieMembershipId);
    expect(settings.showNewItems).toBe(true);

    await setSetting(client, appId, bungieMembershipId, {
      showNewItems: false,
    });

    const settings2 = await getSettings(client, bungieMembershipId);
    expect(settings2.showNewItems).toBe(false);
  });
});

it('can partially update settings', async () => {
  await transaction(async (client) => {
    await setSetting(client, appId, bungieMembershipId, {
      showNewItems: true,
    });

    const settings = await getSettings(client, bungieMembershipId);
    expect(settings.showNewItems).toBe(true);

    await setSetting(client, appId, bungieMembershipId, {
      singleCharacter: true,
    });

    const settings2 = await getSettings(client, bungieMembershipId);
    expect(settings2.showNewItems).toBe(true);
  });
});
