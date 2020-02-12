import asyncHandler from 'express-async-handler';
import { transaction } from '../db';
import { CreateAppRequest, ApiApp } from '../shapes/app';
import { insertApp } from '../db/apps-queries';
import uuid from 'uuid/v4';

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
    res.status(400).send({
      error: 'InvalidRequest',
      message: `Origin provided is not an origin`
    });
    return;
  }
  if (originUrl.host !== 'localhost') {
    res.status(400).send({
      error: 'InvalidRequest',
      message: `Can only register apps for localhost`
    });
    return;
  }

  if (!/^[a-z0-9-]{3,}$/.test(request.id)) {
    res.status(400).send({
      error: 'InvalidRequest',
      message: `id must match the regex /^[a-z0-9-]{3,}$/`
    });
    return;
  }

  if (!request.bungieApiKey) {
    res.status(400).send({
      error: 'InvalidRequest',
      message: `bungieApiKey must be present`
    });
    return;
  }

  const app: ApiApp = {
    ...request,
    origin: originUrl.origin,
    dimApiKey: uuid()
  };

  await transaction(async (client) => {
    await insertApp(client, app);
  });

  res.status(200).send({
    app
  });
});
