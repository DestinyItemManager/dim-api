import asyncHandler from 'express-async-handler';
import { pool } from '../db';
import { defaultGlobalSettings, GlobalSettings } from '../shapes/global-settings';
import { camelize } from '../utils';

export const platformInfoHandler = asyncHandler(async (_, res) => {
  const result = await pool.query<GlobalSettings>({
    name: 'get_global_settings',
    text: 'SELECT * FROM global_settings',
  });
  const settings = { ...defaultGlobalSettings, ...camelize(result.rows[0]) };

  // Instruct CF to cache for 15 minutes
  res.set('Cache-Control', 'max-age=900');
  res.send({
    settings,
  });
});
