import asyncHandler from 'express-async-handler';
import { transaction } from '../db';
import { CreateAppRequest, ApiApp } from '../shapes/app';
import { insertApp, getAppById } from '../db/apps-queries';
import { v4 as uuid } from 'uuid';
import { badRequest } from '../utils';

const localHosts = /(^(localhost|127\.0\.0\.1|100\.115\.92|192\.168\.|10\.|172\.16\.)|(\.lan|\.local|\.internal|\.lxd)$)/;

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
      `Can only register apps that match ${localHosts}, your host was ${
        originUrl.hostname
      }`
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
    dimApiKey: uuid()
  };

  await transaction(async (client) => {
    try {
      await insertApp(client, app);
    } catch (e) {
      // This is a unique constraint violation, so just get the app!
      if (e.code == '23505') {
        await client.query('ROLLBACK');
        app = (await getAppById(client, request.id))!;
      } else {
        throw e;
      }
    }
  });

  // Only return the recovered app if it's for the same origin
  if (app.origin === originUrl.origin) {
    res.send({
      app
    });
  } else {
    badRequest(res, 'An app already exists with that id');
  }
});
