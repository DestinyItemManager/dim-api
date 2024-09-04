import { keyPath, ListToken } from '@stately-cloud/client';
import { ApiApp } from '../shapes/app.js';
import { client } from './client.js';

/**
 * Get all registered apps.
 */
export async function getAllApps(): Promise<[ApiApp[], ListToken]> {
  let apps = client.beginList('/apps');
  const allApps: ApiApp[] = [];
  let token: ListToken | undefined = undefined;

  while (true) {
    for await (const app of apps) {
      if (client.isType(app, 'ApiApp')) {
        allApps.push(app);
      }
    }

    token = apps.token!;
    if (token.canContinue) {
      apps = client.continueList(token);
    } else {
      break;
    }
  }

  return [allApps, token] as const;
}

/**
 * Update the list of apps with changes from the server.
 */
export async function updateApps(token: ListToken, apps: ApiApp[]): Promise<[ApiApp[], ListToken]> {
  const updates = client.syncList(token);
  for await (const update of updates) {
    switch (update.type) {
      case 'changed': {
        const item = update.item;
        if (client.isType(item, 'ApiApp')) {
          const existingIndex = apps.findIndex((app) => app.id === item.id);
          if (existingIndex >= 0) {
            apps[existingIndex] = item;
          } else {
            apps.push(item);
          }
        }
        break;
      }
      case 'deleted':
      case 'updatedOutsideWindow': {
        const item = update.keyPath;
        // TODO: This could be easier!
        const id = /^\/apps\/app-([^/]+)$/.exec(item)?.[1];
        const existingIndex = apps.findIndex((app) => app.id === id);
        if (existingIndex >= 0) {
          apps.splice(existingIndex, 1);
        }
        break;
      }
      case 'reset': {
        apps = [];
        break;
      }
    }
  }
  return [apps, updates.token!] as const;
}

/**
 * Get an app by its ID.
 */
export async function getAppById(id: string): Promise<ApiApp | undefined> {
  return client.get('ApiApp', keyPath`/apps/app-${id}`);
}

/**
 * Insert a new app into the list of registered apps, or update an existing app.
 */
export async function insertApp(app: ApiApp): Promise<ApiApp> {
  // TODO: wish I could set an if-not-exists condition here, to avoid accidentally updating an app
  return client.put(client.create('ApiApp', app));
}
