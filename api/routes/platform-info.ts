import asyncHandler from 'express-async-handler';
import { pool } from '../db';
import { camelize } from '../utils';
import {
  GlobalSettings,
  defaultGlobalSettings
} from '../shapes/global-settings';

// TODO: middleware to validate the app parameter
export const platformInfoHandler = asyncHandler(async (_, res) => {
  // TODO: load and merge in app-specific settings?
  const result = await pool.query<GlobalSettings>({
    name: 'get_global_settings',
    text: 'SELECT * FROM global_settings'
  });

  // Instruct CF not to cache this
  res.set('Cache-Control', 'no-cache, max-age=0');
  res.send({
    settings: { ...defaultGlobalSettings, ...camelize(result.rows[0]) }
    // TODO: alerts!
  });
});
