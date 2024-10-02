import { v4 as uuid } from 'uuid';
import { ApiApp } from '../shapes/app.js';
import { deleteApp, getAllApps, getAppById, insertApp } from './apps-queries.js';

const appId = 'apps-queries-test-app';
const app: ApiApp = {
  id: 'apps-queries-test-app',
  bungieApiKey: 'foo',
  origin: 'https://localhost',
  dimApiKey: uuid(),
};

beforeEach(() => deleteApp(appId));

it('can create a new app', async () => {
  expect(await getAppById(appId)).toBeUndefined();

  await insertApp(app);

  const fetchedApp = await getAppById(appId);
  expect(fetchedApp?.dimApiKey).toEqual(app.dimApiKey);
});

it('gets the same app when inserting twice', async () => {
  const appReturn = await insertApp(app);
  expect(appReturn.dimApiKey).toEqual(app.dimApiKey);
  const appReturn2 = await insertApp(app);
  expect(appReturn2).toEqual(appReturn);
  expect(await getAppById(appId)).toEqual(appReturn2);
});

it('can get all apps', async () => {
  await insertApp(app);

  const [apps, token] = await getAllApps();
  expect(token).toBeDefined();
  expect(token.canSync).toBe(true);
  expect(apps.length).toBeGreaterThanOrEqual(1);
  expect(apps.find((a) => a.id === appId)?.dimApiKey).toBe(app.dimApiKey);
});
