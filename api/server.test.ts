import { app } from './server';
import { readFile } from 'fs';
import { promisify } from 'util';
import supertest from 'supertest';
import { sign } from 'jsonwebtoken';

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

  // Delete all account data from previous runs
  await request
    .post('/delete_all_data')
    .set('X-API-Key', testApiKey)
    .set('Authorization', `Bearer ${testUserToken}`)
    .expect(200);
});

it('returns basic info from GET /', async (done) => {
  // Sends GET Request to / endpoint
  const response = await request.get('/');

  expect(response.status).toBe(200);
  done();
});

describe('/new_app', () => {
  it('can create new apps idempotently', async (done) => {
    // Test that creating an app is idempotent
    const response = await createApp();

    // Same API Key
    expect(response.body.app.dimApiKey).toEqual(testApiKey);
    done();
  });
});

describe('import/export', () => {
  it('can import and export data', async () => {
    importData();

    const response = await request
      .get('/export')
      .set('X-API-Key', testApiKey)
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.settings.itemSortOrderCustom).toEqual([
      'tag',
      'rarity',
      'primStat',
      'typeName',
      'name'
    ]);
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
