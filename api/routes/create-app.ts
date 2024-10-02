import asyncHandler from 'express-async-handler';
import { DatabaseError } from 'pg-protocol';
import { v4 as uuid } from 'uuid';
import { insertApp as insertAppPostgres } from '../db/apps-queries.js';
import { transaction } from '../db/index.js';
import { ApiApp, CreateAppRequest } from '../shapes/app.js';
import { insertApp } from '../stately/apps-queries.js';
import { badRequest } from '../utils.js';

const localHosts =
  /(^(localhost|127\.0\.0\.1|100\.115\.92|192\.168\.|10\.|172\.16\.)|(\.lan|\.local|\.internal|\.lxd)$)/;

/**
 * Create a new API app. This is meant to be used by developers who create
 * their own testing app for local testing. In the future it may be extended
 * to allow creating non-test apps through an admin interface.
 */
export const createAppHandler = asyncHandler(async (req, res) => {
  const request = req.body as CreateAppRequest;

  // Normalize/validate origin
  const originUrl = new URL(request.origin);

  if (originUrl.origin !== request.origin) {
    badRequest(res, 'Origin provided is not an origin');
    return;
  }
  if (!localHosts.test(originUrl.hostname)) {
    badRequest(
      res,
      `Can only register apps that match ${localHosts}, your host was ${originUrl.hostname}`,
    );
    return;
  }

  if (!/^[a-z0-9-]{3,}$/.test(request.id)) {
    badRequest(res, 'id must match the regex /^[a-z0-9-]{3,}$/');
    return;
  }

  if (!request.bungieApiKey) {
    badRequest(res, 'bungieApiKey must be present');
    return;
  }

  let app: ApiApp = {
    ...request,
    origin: originUrl.origin,
    dimApiKey: uuid(),
  };

  // Put it in StatelyDB
  app = await insertApp(app);

  // Also put it in Postgres, for now!
  await transaction(async (client) => {
    try {
      await insertAppPostgres(client, app);
    } catch (e) {
      // This is a unique constraint violation, so just get the app!
      if (e instanceof DatabaseError && e.code === '23505') {
        await client.query('ROLLBACK');
      } else {
        throw e;
      }
    }
  });

  // Only return the recovered app if it's for the same origin and key
  if (app.origin === originUrl.origin && app.bungieApiKey === request.bungieApiKey) {
    res.send({
      app: {
        id: app.id,
        dimApiKey: app.dimApiKey,
        origin: app.origin,
      },
    });
  } else {
    badRequest(res, 'An app already exists with that id');
  }
});
