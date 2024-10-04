import * as Sentry from '@sentry/node';
import { ServerResponse, UserMembershipData } from 'bungie-api-ts/user';
import asyncHandler from 'express-async-handler';
import util from 'util';
import { AuthTokenRequest, AuthTokenResponse } from '../shapes/auth.js';

import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import _ from 'lodash';
import { metrics } from '../metrics/index.js';
import { ApiApp } from '../shapes/app.js';
import { badRequest } from '../utils.js';

const TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60; // 30 days

const signJwt = util.promisify<string | Buffer | object, Secret, SignOptions, string>(jwt.sign);

export const authTokenHandler = asyncHandler(async (req, res) => {
  const { bungieAccessToken, membershipId } = req.body as AuthTokenRequest;
  const apiApp = req.dimApp as ApiApp;

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
    const bungieResponse = await fetch(
      'https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/',
      {
        headers: {
          'X-API-Key': apiApp.bungieApiKey,
          Authorization: `Bearer ${bungieAccessToken}`,
        },
      },
    );

    if (!bungieResponse.ok) {
      try {
        const errorBody = (await bungieResponse.clone().json()) as ApiError;
        if (errorBody.ErrorStatus === 'WebAuthRequired') {
          metrics.increment('authToken.webAuthRequired.count');
          res.status(401).send({
            error: 'WebAuthRequired',
            message: `Bungie.net token is not valid`,
          });
          return;
        } else {
          throw new Error(
            `Error from Bungie.net while verifying token: ${errorBody.ErrorStatus}: ${errorBody.Message}`,
          );
        }
      } catch {
        const errorBody = await bungieResponse.text();
        throw new Error(`Error from Bungie.net while verifying token: ${errorBody}`);
      }
    }

    const responseData = (await bungieResponse.json()) as ServerResponse<UserMembershipData>;

    const serverMembershipId = responseData.Response.bungieNetUser.membershipId;
    if (serverMembershipId === membershipId) {
      const primaryMembershipId = responseData.Response.primaryMembershipId;
      const profileIds = _.sortBy(
        responseData.Response.destinyMemberships
          // Filter out accounts that are tied to another platform's cross-save account.
          .filter((m) => !m.crossSaveOverride || m.crossSaveOverride === m.membershipType)
          .map((m) => m.membershipId),
        // Sort the primary membership ID so it's always the first one (if it
        // exists?). The only reason someone would have multiple accounts is if
        // they don't have cross-save enabled.
        (membershipId) => (membershipId === primaryMembershipId ? 0 : 1),
      );
      if (profileIds.length === 0) {
        Sentry.captureMessage('Empty profileIds', (scope) => {
          scope.setExtras({
            primaryMembershipId,
            destinyMemberships: responseData.Response.destinyMemberships,
          });
          return scope;
        });
        metrics.increment('authToken.emptyMemberships.count');
      }

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
        },
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
    Sentry.captureException(e);
    console.error('Error issuing auth token', e);
    throw e;
  }
});

interface ApiError {
  ErrorStatus: string;
  Message: string;
}
