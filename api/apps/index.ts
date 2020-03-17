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
  if (req.method === 'OPTIONS' || req.path === '/heathcheck') {
    next();
    return;
  }
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    metrics.increment('apiKey.missing.count');
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
    metrics.increment('apiKey.noAppFound.count');
    res.status(401).send({
      error: 'NoAppFound',
      message: 'No app found that matches the provided API key'
    });
  }
});

let apps: ApiApp[];
let appsPromise: Promise<ApiApp[]> | null = null;
let appsInterval: NodeJS.Timeout | null = null;

export function stopAppsRefresh() {
  if (appsInterval) {
    clearTimeout(appsInterval);
  }
  appsInterval = null;
}

/**
 * Look up an app by its API key.
 */
async function getAppByApiKey(apiKey: string) {
  const apps = await getApps();
  const app = apps.find(
    (app) => app.dimApiKey.toLowerCase() === apiKey.toLowerCase()
  );
  if (!app) {
    console.error('No app found: ', apps, apiKey);
  }
  return app;
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
  stopAppsRefresh();
  const client = await pool.connect();
  try {
    apps = await getAllApps(client);
    metrics.increment('apps.refresh.success.count');
    // Refresh again every minute or so
    if (!appsInterval) {
      appsInterval = setTimeout(refreshApps, 60000 + Math.random() * 10000);
    }
    return apps;
  } catch (e) {
    metrics.increment('apps.refresh.error.count');
    console.error('Error refreshing apps', e);
    throw e;
  } finally {
    client.release();
    appsPromise = null;
  }
}
