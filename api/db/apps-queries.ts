import { ClientBase, QueryResult } from 'pg';
import { ApiApp } from '../shapes/app';
import { camelize } from '../utils';

/**
 * Get all registered apps.
 */
export async function getAllApps(client: ClientBase): Promise<ApiApp[]> {
  try {
    const results = await client.query<ApiApp>({
      name: 'get_all_apps',
      text: 'SELECT * FROM apps',
    });
    return results.rows.map((row) => camelize<ApiApp>(row));
  } catch (e) {
    throw new Error(e.name + ': ' + e.message);
  }
}

/**
 * Get an app by its ID.
 */
export async function getAppById(
  client: ClientBase,
  id: string
): Promise<ApiApp | null> {
  try {
    const results = await client.query<ApiApp>({
      name: 'get_apps',
      text: 'SELECT * FROM apps where id = $1',
      values: [id],
    });
    if (results.rows.length > 0) {
      return camelize<ApiApp>(results.rows[0]);
    } else {
      return null;
    }
  } catch (e) {
    throw new Error(e.name + ': ' + e.message);
  }
}

/**
 * Insert a new app into the list of registered apps.
 */
export async function insertApp(
  client: ClientBase,
  app: ApiApp
): Promise<QueryResult<any>> {
  try {
    return client.query({
      name: 'insert_app',
      text: `insert into apps (id, bungie_api_key, dim_api_key, origin)
values ($1, $2, $3, $4)`,
      values: [app.id, app.bungieApiKey, app.dimApiKey, app.origin],
    });
  } catch (e) {
    throw new Error(e.name + ': ' + e.message);
  }
}
