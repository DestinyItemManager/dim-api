import apps from '../config/apps.json';
import { AuthTokenRequest, AuthTokenResponse } from '../shapes/auth';
import superagent from 'superagent';
import asyncHandler from 'express-async-handler';
import util from 'util';

import { sign, Secret, SignOptions } from 'jsonwebtoken';

const signJwt = util.promisify<
  string | Buffer | object,
  Secret,
  SignOptions,
  string
>(sign);

interface ApiApp {
  bungieApiKey: string;
  dimApiKey: string;
}

export const authTokenHandler = asyncHandler(async (req, res) => {
  const { app, bungieAccessToken, membershipId } = req.body as AuthTokenRequest;

  const apiApp = apps[app] as ApiApp;
  if (!apiApp) {
    res.status(403).send(`App ${app} not registered`);
  }

  // TODO: validate the rest

  // TODO: error handling (or error handling route?)

  // make request to bungie
  try {
    console.log('Sending');
    const bungieResponse = await superagent
      .get('https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/')
      .set('X-API-Key', apiApp.bungieApiKey)
      .set('Authorization', `Bearer ${bungieAccessToken}`);
    console.log(bungieResponse.body);

    // TODO: idx
    const serverMembershipId =
      bungieResponse.body.Response.bungieNetUser.membershipId;
    if (serverMembershipId === membershipId) {
      // generate and return a badass token
      const token = await signJwt({ foo: 'bar' }, 'shhhhh', {
        expiresIn: 30 * 24 * 60 * 60
      });

      const response: AuthTokenResponse = {
        accessToken: token,
        expiresInSeconds: 30 * 24 * 60 * 60
      };

      res.send(response);
    } else {
      res.status(403).send(`Hey you're not ${membershipId}`);
    }
  } catch (e) {
    console.log(e);
    throw new Error(
      `${e.response.body.ErrorStatus}: ${e.response.body.Message}`
    );
  }
});
