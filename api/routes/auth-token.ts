import * as Sentry from '@sentry/node';
import { ServerResponse, UserMembershipData } from 'bungie-api-ts/user';
import asyncHandler from 'express-async-handler';
import superagent from 'superagent';
import util from 'util';
import { AuthTokenRequest, AuthTokenResponse } from '../shapes/auth';

import { Secret, sign, SignOptions } from 'jsonwebtoken';
import _ from 'lodash';
import { metrics } from '../metrics';
import { badRequest } from '../utils';

const TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60; // 30 days

const signJwt = util.promisify<string | Buffer | object, Secret, SignOptions, string>(sign);

export const authTokenHandler = asyncHandler(async (req, res) => {
  const { bungieAccessToken, membershipId } = req.body as AuthTokenRequest;
  const apiApp = req.dimApp!;

  if (!bungieAccessToken) {
    badRequest(res, 'No bungieAccessToken provided');
    return;
  }

  if (!membershipId) {
    badRequest(res, 'No membershipId provided');
    return;
  }

  // make request to bungie
  try {
    const bungieResponse = await superagent
      .get('https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/')
      .set('X-API-Key', apiApp.bungieApiKey)
      .set('Authorization', `Bearer ${bungieAccessToken}`);

    const responseData = bungieResponse.body as ServerResponse<UserMembershipData>;

    const serverMembershipId = responseData.Response.bungieNetUser.membershipId;
    const primaryMembershipId = responseData.Response.primaryMembershipId;
    const profileIds = _.sortBy(
      responseData.Response.destinyMemberships
        .filter((m) => !m.crossSaveOverride)
        .map((m) => m.membershipId),
      // Sort the primary membership ID so it's always the first one (if it
      // exists?). The only reason someone would have multiple accounts is if
      // they don't have cross-save enabled.
      (membershipId) => (membershipId === primaryMembershipId ? 0 : 1)
    );
    if (serverMembershipId === membershipId) {
      // generate and return a token
      const token = await signJwt(
        {
          // Save the IDs of all the profiles this account can see, to allow us
          // to control access at the Destiny Profile level instead of the
          // Bungie.net account level. This is because Destiny profiles can
          // apparently be reassigned to different Destiny IDs all the time. We
          // stuff this in the JWT so we don't have to check with Bungie.net for
          // every action.
          profileIds,
        },
        process.env.JWT_SECRET!,
        {
          subject: membershipId,
          issuer: apiApp.dimApiKey,
          expiresIn: TOKEN_EXPIRES_IN,
          // TODO: save all profile memberships
        }
      );

      const response: AuthTokenResponse = {
        accessToken: token,
        expiresInSeconds: TOKEN_EXPIRES_IN,
      };

      res.send(response);
    } else {
      console.warn('WrongMembership', membershipId, serverMembershipId);
      metrics.increment('authToken.wrongMembership.count');
      res.status(403).send({
        error: 'WrongMembership',
        message: `Hey you're not ${membershipId}`,
      });
    }
  } catch (e) {
    if (e.response && e.response.body.ErrorStatus == 'WebAuthRequired') {
      metrics.increment('authToken.webAuthRequired.count');
      res.status(401).send({
        error: 'WebAuthRequired',
        message: `Bungie.net token is not valid`,
      });
    } else {
      Sentry.captureException(e);
      console.error('Error issuing auth token', e);
      throw new Error(
        `Error from Bungie.net while verifying token: ${e.response?.body.ErrorStatus}: ${e.response?.body.Message}`
      );
    }
  }
});
