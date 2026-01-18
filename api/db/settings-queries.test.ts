import { closeDbPool, transaction } from './index.js';
import { getSettings, setSetting } from './settings-queries.js';

const bungieMembershipId = 4321;

afterAll(async () => closeDbPool());

it('can insert settings where none exist before', async () => {
  await transaction(async (client) => {
    await setSetting(client, bungieMembershipId, {
      showNewItems: true,
    });

    const settings = (await getSettings(client, bungieMembershipId))!.settings;
    expect(settings.showNewItems).toBe(true);
  });
});

it('can update settings', async () => {
  await transaction(async (client) => {
    await setSetting(client, bungieMembershipId, {
      showNewItems: true,
    });

    const settings = (await getSettings(client, bungieMembershipId))!.settings;
    expect(settings.showNewItems).toBe(true);

    await setSetting(client, bungieMembershipId, {
      showNewItems: false,
    });

    const settings2 = (await getSettings(client, bungieMembershipId))!.settings;
    expect(settings2.showNewItems).toBe(false);
  });
});

it('can partially update settings', async () => {
  await transaction(async (client) => {
    await setSetting(client, bungieMembershipId, {
      showNewItems: true,
    });

    const settings = (await getSettings(client, bungieMembershipId))!.settings;
    expect(settings.showNewItems).toBe(true);

    await setSetting(client, bungieMembershipId, {
      singleCharacter: true,
    });

    const settings2 = (await getSettings(client, bungieMembershipId))!.settings;
    expect(settings2.showNewItems).toBe(true);
  });
});
