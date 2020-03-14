import { pool, transaction } from '.';
import { insertApp, getAppById, getAllApps } from './apps-queries';
import { v4 as uuid } from 'uuid';
import { ApiApp } from '../shapes/app';

const appId = 'apps-queries-test-app';
const app: ApiApp = {
  id: 'apps-queries-test-app',
  bungieApiKey: 'foo',
  origin: 'https://localhost',
  dimApiKey: uuid()
};

beforeEach(() =>
  pool.query({ text: 'delete from apps where id = $1', values: [appId] })
);

afterAll(() => pool.end());

it('can create a new app', async () => {
  await transaction(async (client) => {
    expect(await getAppById(client, appId)).toBeNull();

    await insertApp(client, app);

    const fetchedApp = await getAppById(client, appId);
    expect(fetchedApp?.dimApiKey).toEqual(app.dimApiKey);
  });
});

it('cannot create a new app with the same name as an existing one', async () => {
  await transaction(async (client) => {
    await insertApp(client, app);
    try {
      await insertApp(client, app);
    } catch (e) {
      expect(e.code).toBe('23505');
    }
  });
});

it('can get all apps', async () => {
  await transaction(async (client) => {
    await insertApp(client, app);

    const apps = await getAllApps(client);
    expect(apps.length).toBeGreaterThanOrEqual(1);
    expect(apps.find((a) => a.id === appId)?.dimApiKey).toBe(app.dimApiKey);
  });
});
