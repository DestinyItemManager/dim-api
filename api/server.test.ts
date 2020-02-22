import { app } from './server';
import { readFile } from 'fs';
import { promisify } from 'util';
import supertest from 'supertest';
import { sign } from 'jsonwebtoken';
import { ExportResponse } from './shapes/export';
import { ProfileResponse } from './shapes/profile';
import { GlobalSettings } from './routes/platform-info';

const request = supertest(app);

let testApiKey;
let testUserToken;

beforeAll(async () => {
  const appResponse = await createApp();
  testApiKey = appResponse.body.app.dimApiKey;
  expect(testApiKey).toBeDefined();

  testUserToken = sign({}, process.env.JWT_SECRET!, {
    subject: '1234',
    issuer: testApiKey,
    expiresIn: 60 * 60
  });

  /*
  // Delete all account data from previous runs
  await request
    .post('/delete_all_data')
    .set('X-API-Key', testApiKey)
    .set('Authorization', `Bearer ${testUserToken}`)
    .expect(200);
    // TODO: test this
    */
});

it('returns basic info from GET /', async () => {
  // Sends GET Request to / endpoint
  const response = await request.get('/');

  expect(response.status).toBe(200);
});

it('returns global info from GET /platform_info', async () => {
  const response = await request
    .get('/platform_info')
    .expect('Content-Type', /json/)
    .expect(200);

  const platformInfo = response.body.settings as GlobalSettings;

  expect(platformInfo.dimApiEnabled).toBe(true);
});

it('can create new apps idempotently', async () => {
  // Test that creating an app is idempotent
  const response = await createApp();

  // Same API Key
  expect(response.body.app.dimApiKey).toEqual(testApiKey);
});

describe('import/export', () => {
  it('can import and export data', async () => {
    await importData();

    const response = await request
      .get('/export')
      .set('X-API-Key', testApiKey)
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    const exportResponse = response.body as ExportResponse;

    expect(exportResponse.settings.itemSortOrderCustom).toEqual([
      'tag',
      'rarity',
      'primStat',
      'typeName',
      'name'
    ]);

    expect(exportResponse.loadouts.length).toBe(12);
    expect(exportResponse.tags.length).toBe(51);
  });

  // TODO: other import formats, validation
});

describe('profile', () => {
  // Applies only to tests in this describe block
  beforeEach(async () => {
    await importData();
  });
  it('can retrieve all profile data', async () => {
    const response = await request
      .get(
        '/profile?components=settings,loadouts,tags&platformMembershipId=4611686018433092312'
      )
      .set('X-API-Key', testApiKey)
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    const profileResponse = response.body as ProfileResponse;

    expect(profileResponse.settings!.itemSortOrderCustom).toEqual([
      'tag',
      'rarity',
      'primStat',
      'typeName',
      'name'
    ]);
    expect(profileResponse.loadouts!.length).toBe(11);
    expect(profileResponse.tags!.length).toBe(51);
  });
});

async function createApp() {
  const response = await request
    .post('/new_app')
    .send({
      id: 'test-app',
      bungieApiKey: 'test-api-key',
      origin: 'https://localhost:8080'
    })
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.app.dimApiKey).toBeDefined();

  return response;
}

async function importData() {
  const file = JSON.parse(
    (await promisify(readFile)('./dim-data.json')).toString()
  );

  await request
    .post('/import')
    .set('X-API-Key', testApiKey)
    .set('Authorization', `Bearer ${testUserToken}`)
    .send(file)
    .expect(200);

  return file;
}
