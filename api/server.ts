import * as Sentry from '@sentry/node';
import cors from 'cors';
import express, { ErrorRequestHandler } from 'express';
import { expressjwt as jwt } from 'express-jwt';
import { type JwtPayload } from 'jsonwebtoken';
import { apiKey, isAppOrigin } from './apps/index.js';
import expressStatsd from './metrics/express.js';
import { metrics } from './metrics/index.js';
import { authTokenHandler } from './routes/auth-token.js';
import { createAppHandler } from './routes/create-app.js';
import { deleteAllDataHandler } from './routes/delete-all-data.js';
import { exportHandler } from './routes/export.js';
import { importHandler } from './routes/import.js';
import { getLoadoutShareHandler, loadoutShareHandler } from './routes/loadout-share.js';
import { platformInfoHandler } from './routes/platform-info.js';
import { profileHandler } from './routes/profile.js';
import { updateHandler } from './routes/update.js';
import { ApiApp } from './shapes/app.js';
import { UserInfo } from './shapes/user.js';

export const app = express();

app.use(expressStatsd({ client: metrics, prefix: 'http' })); // metrics
app.use(express.json({ limit: '2mb' })); // for parsing application/json

/** CORS config that allows any origin to call */
const permissiveCors = cors({
  maxAge: 3600,
});

// These paths can be accessed by any caller
app.options('/', permissiveCors);
app.get('/', permissiveCors, (_, res) => res.send({ message: 'Hello from DIM!!!' }));
app.post('/', permissiveCors, (_, res) => res.status(404).send('Not Found'));
app.get('/favicon.ico', permissiveCors, (_, res) => res.status(404).send('Not Found'));

app.options('/platform_info', permissiveCors);
app.get('/platform_info', permissiveCors, platformInfoHandler);
app.options('/new_app', permissiveCors);
app.post('/new_app', permissiveCors, createAppHandler);
// Get a shared loadout
app.get('/loadout_share', permissiveCors, getLoadoutShareHandler);

/* ****** API KEY REQUIRED ****** */
/* Any routes declared below this will require an API Key in X-API-Key header */

app.use(apiKey);

// Use the list of known DIM apps to set the CORS header
const apiKeyCors = cors({
  origin: (origin, callback) => {
    // We can't check the API key in OPTIONS requests (the header isn't sent)
    // so we have to just check if their origin is on *any* app and let them
    // through.
    if (!origin || isAppOrigin(origin)) {
      callback(null, true);
    } else {
      console.warn('UnknownOrigin', origin);
      metrics.increment('apiKey.unknownOrigin.count');
      callback(null, false);
    }
  },
  maxAge: 3600,
});
app.use(apiKeyCors);

// Validate that the API key in the header is valid for this origin.
app.use((req, res, next) => {
  const dimApp = req.dimApp as ApiApp | undefined;
  if (dimApp && req.headers.origin && dimApp.origin !== req.headers.origin) {
    console.warn('OriginMismatch', dimApp?.id, dimApp?.origin, req.headers.origin);
    metrics.increment('apiKey.wrongOrigin.count');
    // TODO: sentry
    res.status(401).send({
      error: 'OriginMismatch',
      message:
        'The origin of this request and the origin registered to the provided API key do not match',
    });
  } else {
    next();
  }
});

// TODO: just explicitly use API key cors on everything so it shows up

app.options('/auth/token', (_req, res) => res.send(200)); // explicitly here so it doesn't get caught by JWT
app.post('/auth/token', authTokenHandler);

/* ****** USER AUTH REQUIRED ****** */
/* Any routes declared below this will require an auth token */

app.all(
  '*',
  jwt({
    secret: process.env.JWT_SECRET!,
    requestProperty: 'jwt',
    algorithms: ['HS256'],
  }),
);

// Copy info from the auth token into a "user" parameter on the request.
app.use((req, _, next) => {
  if (!req.jwt) {
    console.error('JWT expected', req.path);
    next(new Error('Expected JWT info'));
  } else {
    const jwt = req.jwt as JwtPayload & { profileIds?: string[] };
    if (jwt.exp) {
      const nowSecs = Date.now() / 1000;
      if (jwt.exp > nowSecs) {
        metrics.timing('authToken.age', jwt.exp - nowSecs);
      } else {
        metrics.increment('authToken.expired.count');
      }
    }

    req.user = {
      bungieMembershipId: parseInt(jwt.sub!, 10),
      dimApiKey: jwt.iss!,
      profileIds: jwt.profileIds ?? [],
    };
    next();
  }
});

// Validate that the auth token and the API key in the header match.
app.use((req, res, next) => {
  const dimApp = req.dimApp as ApiApp | undefined;
  const jwt = req.jwt as JwtPayload & { profileIds?: string[] };
  if (dimApp && dimApp.dimApiKey !== jwt.iss) {
    console.warn('ApiKeyMismatch', dimApp?.id, dimApp?.dimApiKey, jwt.iss);
    metrics.increment('apiKey.mismatch.count');
    res.status(401).send({
      error: 'ApiKeyMismatch',
      message:
        'The auth token was issued for a different app than the API key in X-API-Key indicates',
    });
  } else {
    next();
  }
});

// Get user data
app.get('/profile', profileHandler);
// Add or update items in the profile
app.post('/profile', updateHandler);

// Import data from old DIM, or that was exported using /export
app.post('/import', importHandler);
// Export all data for an account
app.get('/export', exportHandler);
// Delete all data for an account
app.post('/delete_all_data', deleteAllDataHandler);
// Share a loadout
app.post('/loadout_share', loadoutShareHandler);

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const dimApp = req.dimApp as ApiApp | undefined;
  const user = req.user as UserInfo | undefined;
  const dimVersion = req.headers['x-dim-version']?.[0];
  Sentry.captureException(err, {
    tags: {
      dimApp: dimApp?.id,
      user: user?.bungieMembershipId,
      dimVersion: `v${dimVersion ?? 'Unknown'}`,
    },
  });
  // Allow any origin to see the response
  res.header('Access-Control-Allow-Origin', '*');
  if (err instanceof Error && err.name === 'UnauthorizedError') {
    console.warn('Unauthorized', dimApp?.id, req.originalUrl, err);
    res.status(401).send({
      error: err.name,
      message: err.message,
    });
  } else {
    const e = err instanceof Error ? err : new Error(`${err}`);

    console.error(
      'ServerError',
      dimApp?.id,
      req.method,
      req.originalUrl,
      user?.bungieMembershipId,
      err,
    );
    res.status(500).send({
      error: e.name,
      message: e.message,
    });
  }
};
app.use(errorHandler);
