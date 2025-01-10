import asyncHandler from 'express-async-handler';
import { defaultGlobalSettings } from '../shapes/global-settings.js';
import { getGlobalSettings } from '../stately/global-settings.js';

export const platformInfoHandler = asyncHandler(async (req, res) => {
  const flavor = (req.query.flavor as string) ?? 'app';

  // Try StatelyDB first, then fall back to Postgres
  const settings = (await getGlobalSettings(flavor)) ?? defaultGlobalSettings;

  // Instruct CF to cache for 15 minutes
  res.set('Cache-Control', 'public, max-age=900');
  res.send({
    settings,
  });
});
