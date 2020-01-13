import NodeCache from 'node-cache';
import { pool } from '../db';

/**
 * An app registered with the DIM API.
 */
export interface ApiApp {
  /** A short ID that uniquely identifies the app. */
  id: string;
  /** Apps must share their Bungie.net API key with us. */
  bungieApiKey: string;
  /** Apps also get a generated API key for accessing DIM APIs that don't involve user data. */
  dimApiKey: string;
}

// Expire entries in 1 hour
const appCache = new NodeCache({ stdTTL: 60 * 60, useClones: false });

export function getApp(id: string): Promise<ApiApp | null> {
  let appPromise = appCache.get<Promise<ApiApp | null>>(id);
  if (appPromise) {
    return appPromise;
  }

  appPromise = (async () => {
    const result = await pool.query(
      'SELECT * FROM apps WHERE id = $1 LIMIT 1',
      [id]
    );

    if (!result.rows.length) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      bungieApiKey: row.bungie_api_key,
      dimApiKey: row.dim_api_key
    };
  })();

  // TODO: catch the promise and delete the app?

  appCache.set<Promise<ApiApp | null>>(id, appPromise);

  return appPromise;
}
