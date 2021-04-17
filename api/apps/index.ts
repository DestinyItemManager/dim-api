import { pool } from '../db';
import { ApiApp } from '../shapes/app';
import { getAllApps } from '../db/apps-queries';
import { metrics } from '../metrics';
import _ from 'lodash';
import { RequestHandler } from 'express';
import * as Sentry from '@sentry/node';

/**
 * Express middleware that requires an API key be provided in a header
 * and populates app info in the request based on the matching app.
 */
export const apiKey: RequestHandler = (req, res, next) => {
  if (req.method === 'OPTIONS' || req.path === '/heathcheck') {
    next();
    return;
  }
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    metrics.increment('apiKey.missing.count');
    res.status(401).send({
      error: 'MissingApiKey',
      message: 'This request requires the X-API-Key header to be set',
    });
    return;
  }

  const app = getAppByApiKey(apiKey);
  if (app) {
    req.dimApp = app;
    next();
  } else {
    metrics.increment('apiKey.noAppFound.count');
    res.status(401).send({
      error: 'NoAppFound',
      message: 'No app found that matches the provided API key',
    });
  }
};

let apps: ApiApp[];
let appsByApiKey: { [apiKey: string]: ApiApp };
let origins = new Set<string>();
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
function getAppByApiKey(apiKey: string) {
  const app = appsByApiKey[apiKey.toLowerCase()];
  if (!app) {
    console.error('No app found: ', apps, apiKey);
  }
  return app;
}

export function isAppOrigin(origin: string) {
  return origins.has(origin);
}

export async function refreshApps() {
  stopAppsRefresh();

  try {
    const client = await pool.connect();
    try {
      apps = await getAllApps(client);
      appsByApiKey = _.keyBy(apps, (a) => a.dimApiKey.toLowerCase());
      origins = new Set<string>();
      for (const app of apps) {
        origins.add(app.origin);
      }
      metrics.increment('apps.refresh.success.count');
      return apps;
    } catch (e) {
      metrics.increment('apps.refresh.error.count');
      console.error('Error refreshing apps', e);
      Sentry.captureException(e);
      throw e;
    } finally {
      client.release();
    }
  } finally {
    // Refresh again every minute or so
    if (!appsInterval) {
      appsInterval = setTimeout(refreshApps, 60000 + Math.random() * 10000);
    }
  }
}
