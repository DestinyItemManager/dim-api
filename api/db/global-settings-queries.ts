import { GlobalSettings } from '../shapes/global-settings.js';
import { pool } from './index.js';

export async function getGlobalSettingsQuery(flavor: string) {
  return pool.query<{ settings: GlobalSettings }>({
    name: 'get_global_settings',
    text: 'SELECT * FROM global_settings where flavor = $1 LIMIT 1',
    values: [flavor],
  });
}

export async function setGlobalSettings(flavor: string, settings: Partial<GlobalSettings>) {
  return pool.query({
    name: 'set_global_settings',
    text: `
      INSERT INTO global_settings (flavor, settings, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (flavor)
      DO UPDATE SET settings = (global_settings.settings || $2)
    `,
    values: [flavor, settings],
  });
}
