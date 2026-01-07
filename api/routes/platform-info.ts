import asyncHandler from 'express-async-handler';
import { getGlobalSettingsQuery } from '../db/global-settings-queries.js';
import { defaultGlobalSettings, GlobalSettings } from '../shapes/global-settings.js';
import { getGlobalSettings } from '../stately/global-settings.js';

export const platformInfoHandler = asyncHandler(async (req, res) => {
  const flavor = (req.query.flavor as string) ?? 'app';

  let settings: GlobalSettings | undefined = undefined;

  // Try Postgres first, then fall back to StatelyDB

  try {
    const result = await getGlobalSettingsQuery(flavor);
    if (result.rowCount! > 0) {
      settings = { ...defaultGlobalSettings, ...result.rows[0].settings };
    } else {
      settings = defaultGlobalSettings;
    }
  } catch {
    settings = (await getGlobalSettings(flavor)) ?? defaultGlobalSettings;
  }

  // Instruct CF to cache for 15 minutes
  res.set('Cache-Control', 'public, max-age=900');
  res.send({
    settings,
  });
});
