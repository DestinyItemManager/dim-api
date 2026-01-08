// Set required env vars BEFORE importing anything
process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
process.env.ADMIN_SESSION_SECRET = 'test-session-secret-for-testing-only';

import express from 'express';
import { makeFetch } from 'supertest-fetch';
import { v4 as uuid } from 'uuid';
import { closeDbPool, pool } from '../../db/index.js';
import { addAppHandler } from './add-app.js';

// Create a simple test app that mounts the handler without auth middleware
const testApp = express();
testApp.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Configure EJS
testApp.set('view engine', 'ejs');
testApp.set('views', '/Users/brh/Documents/oss/dim-api/api');

// Mock req.session.user for all requests
testApp.use((req, _res, next) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  req.session = {
    user: {
      id: 12345,
      login: 'testadmin',
      name: 'Test Admin',
      avatarUrl: 'https://example.com/avatar.jpg',
      isTeamMember: true,
    },
  } as any;
  next();
});

// Mount the handler
testApp.post('/add-app', addAppHandler);

const fetch = makeFetch(testApp);

/**
 * Helper to submit the add-app form with the given data
 */
function postAddApp(data: { appId: string; bungieApiKey: string; origin: string }) {
  return fetch('/add-app', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(data).toString(),
  });
}

/**
 * Helper to verify an error response
 */
async function expectError(response: Response, errorMessage: string, status = 400) {
  const body = await response.text();
  expect(body).toContain('Error:');
  expect(body).toContain(errorMessage);
  expect(response.status).toBe(status);
}

/**
 * Helper to verify a success response
 */
async function expectSuccess(response: Response, appId: string) {
  const body = await response.text();
  expect(body).toContain('App Created Successfully!');
  expect(body).toContain(appId);
  expect(body).toContain('DIM API Key:');
  expect(response.status).toBe(200);
}

/**
 * Helper to verify app was created in database
 */
async function expectAppInDatabase(
  appId: string,
  expectedData: { bungieApiKey: string; origin: string },
) {
  const result = await pool.query<{ bungie_api_key: string; origin: string }>(
    'SELECT * FROM apps WHERE id = $1',
    [appId],
  );
  expect(result.rows.length).toBe(1);
  expect(result.rows[0].bungie_api_key).toBe(expectedData.bungieApiKey);
  expect(result.rows[0].origin).toBe(expectedData.origin);
}

describe('Add App Handler', () => {
  beforeEach(async () => {
    // Clean up any test apps
    await pool.query('DELETE FROM apps WHERE id LIKE $1', ['test-app-%']);
  });

  afterAll(async () => {
    await closeDbPool();
  });

  describe('POST /add-app', () => {
    it('should create a new app with valid data', async () => {
      const testAppId = `test-app-${uuid().substring(0, 8)}`;
      const response = await postAddApp({
        appId: testAppId,
        bungieApiKey: 'test-bungie-key-123',
        origin: 'https://example.com',
      });

      await expectSuccess(response, testAppId);
      await expectAppInDatabase(testAppId, {
        bungieApiKey: 'test-bungie-key-123',
        origin: 'https://example.com',
      });
    });

    it('should reject app ID with uppercase letters', async () => {
      const response = await postAddApp({
        appId: 'Invalid_AppID',
        bungieApiKey: 'test-bungie-key-123',
        origin: 'https://example.com',
      });

      await expectError(response, 'App ID must match');
    });

    it('should reject app ID that is too short', async () => {
      const response = await postAddApp({
        appId: 'ab',
        bungieApiKey: 'test-bungie-key-123',
        origin: 'https://example.com',
      });

      await expectError(response, 'App ID must match');
    });

    it('should reject missing Bungie API key', async () => {
      const response = await postAddApp({
        appId: 'test-app-valid',
        bungieApiKey: '',
        origin: 'https://example.com',
      });

      await expectError(response, 'Bungie API Key is required');
    });

    it('should reject invalid origin URL', async () => {
      const response = await postAddApp({
        appId: 'test-app-valid',
        bungieApiKey: 'test-bungie-key-123',
        origin: 'not-a-valid-url',
      });

      await expectError(response, 'Invalid origin URL');
    });

    it('should reject origin with path', async () => {
      const response = await postAddApp({
        appId: 'test-app-valid',
        bungieApiKey: 'test-bungie-key-123',
        origin: 'https://example.com/path',
      });

      await expectError(response, 'Origin must be a valid origin');
    });

    it('should allow non-localhost origins (unlike public create-app)', async () => {
      const testAppId = `test-app-${uuid().substring(0, 8)}`;
      const response = await postAddApp({
        appId: testAppId,
        bungieApiKey: 'test-bungie-key-123',
        origin: 'https://production-app.com',
      });

      await expectSuccess(response, testAppId);
      await expectAppInDatabase(testAppId, {
        bungieApiKey: 'test-bungie-key-123',
        origin: 'https://production-app.com',
      });
    });

    it('should reject duplicate app ID with different details', async () => {
      const testAppId = `test-app-${uuid().substring(0, 8)}`;

      // Create app first time
      await postAddApp({
        appId: testAppId,
        bungieApiKey: 'test-bungie-key-123',
        origin: 'https://example.com',
      });

      // Try to create again with different origin
      const response = await postAddApp({
        appId: testAppId,
        bungieApiKey: 'test-bungie-key-123',
        origin: 'https://different-origin.com',
      });

      await expectError(response, 'duplicate key value violates unique constraint', 500);
    });
  });
});
