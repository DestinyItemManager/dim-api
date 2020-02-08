import { AuthTokenRequest, AuthTokenResponse } from '../shapes/auth';
import { ServerResponse, UserMembershipData } from 'bungie-api-ts/user';
import superagent from 'superagent';
import asyncHandler from 'express-async-handler';
import util from 'util';

import { sign, Secret, SignOptions } from 'jsonwebtoken';
import { getApp } from '../apps';

const TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60; // 30 days

const signJwt = util.promisify<
  string | Buffer | object,
  Secret,
  SignOptions,
  string
>(sign);

export const authTokenHandler = asyncHandler(async (req, res) => {
  const { app, bungieAccessToken, membershipId } = req.body as AuthTokenRequest;

  if (!app) {
    res.status(400).send('No app provided');
    return;
  }

  const apiApp = await getApp(app);
  if (!apiApp) {
    res.status(400).send(`App ${app} not registered`);
    return;
  }

  if (!bungieAccessToken) {
    res.status(400).send('No bungieAccessToken provided');
  }

  if (!membershipId) {
    res.status(400).send('No membershipId provided');
  }

  console.log('sending request', app, apiApp);
  // make request to bungie
  try {
    const bungieResponse = await superagent
      .get('https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/')
      .set('X-API-Key', apiApp.bungieApiKey)
      .set('Authorization', `Bearer ${bungieAccessToken}`);

    const responseData = bungieResponse.body as ServerResponse<
      UserMembershipData
    >;

    const serverMembershipId = responseData.Response.bungieNetUser.membershipId;
    if (serverMembershipId === membershipId) {
      // generate and return a token
      const token = await signJwt({}, process.env.JWT_SECRET!, {
        subject: membershipId,
        issuer: app,
        expiresIn: TOKEN_EXPIRES_IN
      });

      const response: AuthTokenResponse = {
        accessToken: token,
        expiresInSeconds: TOKEN_EXPIRES_IN
      };

      res.send(response);
    } else {
      res.status(401).send({
        error: 'WrongMembership',
        message: `Hey you're not ${membershipId}`
      });
    }
  } catch (e) {
    if (e.response && e.response.body.ErrorStatus == 'WebAuthRequired') {
      res.status(401).send({
        error: 'WebAuthRequired',
        message: `Bungie.net token is not valid`
      });
    } else {
      console.error('Error issuing auth token', e);
      throw new Error(
        `Error from Bungie.net while verifying token: ${e.response.body.ErrorStatus}: ${e.response.body.Message}`
      );
    }
  }
});
