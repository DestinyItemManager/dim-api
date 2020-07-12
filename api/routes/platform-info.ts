import asyncHandler from 'express-async-handler';
import { pool } from '../db';
import { camelize } from '../utils';
import {
  GlobalSettings,
  defaultGlobalSettings,
} from '../shapes/global-settings';

export const platformInfoHandler = asyncHandler(async (_, res) => {
  const result = await pool.query<GlobalSettings>({
    name: 'get_global_settings',
    text: 'SELECT * FROM global_settings',
  });
  const settings = { ...defaultGlobalSettings, ...camelize(result.rows[0]) };

  // Instruct CF to cache for 5 minutes
  res.set('Cache-Control', 'max-age=300');
  res.send({
    settings,
  });
});
