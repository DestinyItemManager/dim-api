import asyncHandler from 'express-async-handler';
import { pool } from '../db';
import { defaultGlobalSettings, GlobalSettings } from '../shapes/global-settings';
import { camelize } from '../utils';

export const platformInfoHandler = asyncHandler(async (req, res) => {
  const flavor = (req.query.flavor as string) ?? 'app';

  const result = await pool.query<GlobalSettings>({
    name: 'get_global_settings',
    text: 'SELECT * FROM global_settings where flavor = $1 LIMIT 1',
    values: [flavor],
  });
  const settings =
    result.rowCount > 0
      ? { ...defaultGlobalSettings, ...camelize(result.rows[0]) }
      : defaultGlobalSettings;

  // Instruct CF to cache for 15 minutes
  res.set('Cache-Control', 'max-age=900');
  res.send({
    settings,
  });
});
