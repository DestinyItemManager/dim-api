import asyncHandler from 'express-async-handler';
import { pool } from '../db';
import { ApiApp } from '../shapes/app';
import { getAllApps } from '../db/apps-queries';
import { metrics } from '../metrics';

/**
 * Express middleware that requires an API key be provided in a header
 * and populates app info in the request based on the matching app.
 */
export const apiKey = asyncHandler(async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    next();
    return;
  }
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    metrics.increment('apiKey.missing');
    res.status(401).send({
      error: 'MissingApiKey',
      message: 'This request requires the X-API-Key header to be set'
    });
    return;
  }

  const app = await getAppByApiKey(apiKey);
  if (app) {
    req.dimApp = app;
    next();
  } else {
    metrics.increment('apiKey.noAppFound');
    res.status(401).send({
      error: 'NoAppFound',
      message: 'No app found that matches the provided API key'
    });
  }
});

let apps: ApiApp[];
let appsPromise: Promise<ApiApp[]> | null = null;
let appsInterval: number;

/**
 * Look up an app by its API key.
 */
async function getAppByApiKey(apiKey: string) {
  const apps = await getApps();
  return apps.find((app) => app.dimApiKey === apiKey);
}

/** Get all registered apps, loading them if necessary. */
export async function getApps() {
  if (apps) {
    return apps;
  }
  if (appsPromise) {
    return appsPromise;
  }
  appsPromise = refreshApps();
  return appsPromise;
}

async function refreshApps() {
  const client = await pool.connect();
  apps = await getAllApps(client);
  appsPromise = null;
  // Start refreshing automatically
  if (!appsInterval) {
    // Refresh again every minute
    setInterval(refreshApps, 60000);
  }
  return apps;
}
