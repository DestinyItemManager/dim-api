import { keyPath, ListToken } from '@stately-cloud/client';
import { ApiApp } from '../shapes/app.js';
import { client } from './client.js';
import { ApiApp as StatelyApiApp } from './generated/index.js';

/**
 * Get all registered apps.
 */
export async function getAllApps(): Promise<[ApiApp[], ListToken]> {
  const apps = client.withAllowStale(true).beginList('/apps-1');
  const allApps: ApiApp[] = [];
  for await (const app of apps) {
    if (client.isType(app, 'ApiApp')) {
      allApps.push(convertToApiApp(app));
    }
  }
  const token = apps.token!;

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
            apps[existingIndex] = convertToApiApp(item);
          } else {
            apps.push(convertToApiApp(item));
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
  const result = await client.get('ApiApp', keyPathFor(id));
  if (result) {
    return convertToApiApp(result);
  }
  return undefined;
}

/**
 * Insert a new app into the list of registered apps, or get an existing app.
 */
export async function insertApp(app: ApiApp): Promise<ApiApp> {
  let resultApp: ApiApp | undefined;
  // TODO: wish I could set an if-not-exists condition here, to avoid
  // accidentally updating an app. Instead I got a transaction.
  const result = await client.transaction(async (txn) => {
    const getResult = await txn.get('ApiApp', keyPathFor(app.id));
    if (getResult) {
      resultApp = convertToApiApp(getResult);
      return;
    }
    await txn.put(client.create('ApiApp', { ...app, partition: 1n }));
  });

  if (resultApp) {
    return resultApp;
  }

  if (result.committed && result.puts.length === 1) {
    const put = result.puts[0];
    if (client.isType(put, 'ApiApp')) {
      return convertToApiApp(put);
    }
  }

  throw new Error('No ApiApp in result!');
}

export function deleteApp(id: string): Promise<void> {
  return client.del(keyPathFor(id));
}

function keyPathFor(id: string) {
  return keyPath`/apps-1/app-${id}`;
}

// This mostly serves to remove the partition field, which we don't need. It
// would cause problems serializing to JSON, since it's a bigint. It'd be nice
// if I could've used a 32-bit int, but that isn't in the standard schema types...
function convertToApiApp(app: StatelyApiApp): ApiApp {
  return {
    id: app.id,
    bungieApiKey: app.bungieApiKey,
    dimApiKey: app.dimApiKey,
    origin: app.origin,
  };
}
