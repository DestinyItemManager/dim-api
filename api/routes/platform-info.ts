import asyncHandler from 'express-async-handler';
import { pool } from '../db/index.js';
import { defaultGlobalSettings, GlobalSettings } from '../shapes/global-settings.js';
import { getGlobalSettings } from '../stately/global-settings.js';
import { camelize } from '../utils.js';

export const platformInfoHandler = asyncHandler(async (req, res) => {
  const flavor = (req.query.flavor as string) ?? 'app';

  let settings: GlobalSettings | undefined = undefined;
  try {
    // Try StatelyDB first, then fall back to Postgres
    settings = await getGlobalSettings(flavor);
  } catch (e) {
    console.error('Error loading global settings from Stately:', flavor, e);
  }

  if (!settings) {
    const result = await pool.query<GlobalSettings>({
      name: 'get_global_settings',
      text: 'SELECT * FROM global_settings where flavor = $1 LIMIT 1',
      values: [flavor],
    });
    settings =
      result.rowCount! > 0
        ? { ...defaultGlobalSettings, ...camelize(result.rows[0]) }
        : defaultGlobalSettings;
  }

  // Instruct CF to cache for 15 minutes
  res.set('Cache-Control', 'public, max-age=900');
  res.send({
    settings,
  });
});
