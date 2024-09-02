import { ClientBase, QueryResult } from 'pg';
import { ApiApp } from '../shapes/app.js';
import { camelize, KeysToSnakeCase, TypesForKeys } from '../utils.js';

/**
 * Get all registered apps.
 */
export async function getAllApps(client: ClientBase): Promise<ApiApp[]> {
  const results = await client.query<KeysToSnakeCase<ApiApp>>({
    name: 'get_all_apps',
    text: 'SELECT * FROM apps',
  });
  return results.rows.map((row) => camelize(row));
}

/**
 * Get an app by its ID.
 */
export async function getAppById(client: ClientBase, id: string): Promise<ApiApp | null> {
  const results = await client.query<KeysToSnakeCase<ApiApp>>({
    name: 'get_apps',
    text: 'SELECT * FROM apps where id = $1',
    values: [id],
  });
  if (results.rows.length > 0) {
    return camelize(results.rows[0]);
  } else {
    return null;
  }
}

/**
 * Insert a new app into the list of registered apps.
 */
export async function insertApp(client: ClientBase, app: ApiApp): Promise<QueryResult> {
  return client.query<any, TypesForKeys<ApiApp, ['id', 'bungieApiKey', 'dimApiKey', 'origin']>>({
    name: 'insert_app',
    text: `insert into apps (id, bungie_api_key, dim_api_key, origin)
values ($1, $2, $3, $4)`,
    values: [app.id, app.bungieApiKey, app.dimApiKey, app.origin],
  });
}
