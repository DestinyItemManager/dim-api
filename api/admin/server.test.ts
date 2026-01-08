// Set required env vars BEFORE importing anything
process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
process.env.ADMIN_SESSION_SECRET = 'test-session-secret-for-testing-only';

import { makeFetch } from 'supertest-fetch';
import { closeDbPool, pool } from '../db/index.js';
import { app } from '../server.js';

const fetch = makeFetch(app);

describe('Admin Panel', () => {
  afterAll(async () => {
    await closeDbPool();
  });

  beforeEach(async () => {
    // Clear sessions before each test
    await pool.query('DELETE FROM session');
  });

  describe('GET /admin', () => {
    it('redirects to login when not authenticated', async () => {
      const response = await fetch('/admin', { redirect: 'manual' });
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/admin/auth/login');
    });
  });

  describe('GET /admin/auth/login', () => {
    it('redirects to GitHub OAuth authorization URL', async () => {
      const response = await fetch('/admin/auth/login', { redirect: 'manual' });

      expect(response.status).toBe(302);
      const location = response.headers.get('location');
      expect(location).toContain('github.com/login/oauth/authorize');
      expect(location).toContain('client_id=test-client-id');
    });
  });

  describe('GET /admin/auth/callback', () => {
    it('returns 400 when code is missing', async () => {
      const response = await fetch('/admin/auth/callback');

      expect(response.status).toBe(400);
      const body = await response.text();
      expect(body).toContain('Missing authorization code');
    });

    // getLoadoutShareHandler: Testing successful OAuth callback would require mocking the GitHub API
    // which is complex with ES modules in Jest. We test the routing and validation here.
  });

  describe('Session management', () => {
    it('verifies session table exists and is accessible', async () => {
      const result = await pool.query<{ count: string }>('SELECT COUNT(*) as count FROM session');
      // Should be able to query the session table (count could be 0)
      expect(result.rows).toBeDefined();
      expect(result.rows[0]).toBeDefined();
    });
  });
});
