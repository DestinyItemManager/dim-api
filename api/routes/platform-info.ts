import asyncHandler from 'express-async-handler';
import { getGlobalSettingsQuery } from '../db/global-settings-queries.js';
import { defaultGlobalSettings, GlobalSettings } from '../shapes/global-settings.js';

export const platformInfoHandler = asyncHandler(async (req, res) => {
  const flavor = (req.query.flavor as string) ?? 'app';

  let settings: GlobalSettings | undefined = undefined;

  const result = await getGlobalSettingsQuery(flavor);
  if (result.rowCount! > 0) {
    settings = { ...defaultGlobalSettings, ...result.rows[0].settings };
  } else {
    settings = defaultGlobalSettings;
  }

  // Instruct CF to cache for 15 minutes
  res.set('Cache-Control', 'public, max-age=900');
  res.send({
    settings,
  });
});
