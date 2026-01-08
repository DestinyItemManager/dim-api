import asyncHandler from 'express-async-handler';
import { v4 as uuid } from 'uuid';
import { insertApp as insertAppPostgres } from '../../db/apps-queries.js';
import { transaction } from '../../db/index.js';
import { ApiApp } from '../../shapes/app.js';
import { insertApp as insertAppStately } from '../../stately/apps-queries.js';

interface AddAppFormData {
  appId: string;
  bungieApiKey: string;
  origin: string;
}

/**
 * Handler for POST /admin/add-app
 * Creates a new API app with the provided details.
 * Unlike the public create-app endpoint, this allows any origin (not just localhost).
 */
export const addAppHandler = asyncHandler(async (req, res) => {
  const formData = req.body as AddAppFormData;

  // Validate app ID format
  if (!/^[a-z0-9-]{3,}$/.test(formData.appId)) {
    res.status(400).render('admin/views/add-app', {
      user: req.session.user,
      error: 'App ID must match /^[a-z0-9-]{3,}$/',
      formData,
    });
    return;
  }

  // Validate Bungie API key
  if (!formData.bungieApiKey || formData.bungieApiKey.trim().length === 0) {
    res.status(400).render('admin/views/add-app', {
      user: req.session.user,
      error: 'Bungie API Key is required',
      formData,
    });
    return;
  }

  // Validate and normalize origin
  let originUrl: URL;
  try {
    originUrl = new URL(formData.origin);
  } catch {
    res.status(400).render('admin/views/add-app', {
      user: req.session.user,
      error: 'Invalid origin URL',
      formData,
    });
    return;
  }

  if (originUrl.origin !== formData.origin) {
    res.status(400).render('admin/views/add-app', {
      user: req.session.user,
      error: 'Origin must be a valid origin (e.g., https://example.com)',
      formData,
    });
    return;
  }

  // Create the app object
  let app: ApiApp = {
    id: formData.appId,
    bungieApiKey: formData.bungieApiKey.trim(),
    origin: originUrl.origin,
    dimApiKey: uuid(),
  };

  try {
    // Put it in StatelyDB
    app = await insertAppStately(app);

    // Put it in Postgres
    await transaction(async (client) => {
      await insertAppPostgres(client, app);
    });

    // Render success page with app details
    res.render('admin/views/add-app-success', {
      user: req.session.user,
      appId: app.id,
      dimApiKey: app.dimApiKey,
      origin: app.origin,
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
    res.status(500).render('admin/views/add-app', {
      user: req.session.user,
      error: errorMessage,
      formData,
    });
  }
});
