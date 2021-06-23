import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import jwt from 'express-jwt';
import { authTokenHandler } from './routes/auth-token';
import { platformInfoHandler } from './routes/platform-info';
import { metrics } from './metrics';
import { importHandler } from './routes/import';
import { deleteAllDataHandler } from './routes/delete-all-data';
import { exportHandler } from './routes/export';
import { profileHandler } from './routes/profile';
import { createAppHandler } from './routes/create-app';
import { apiKey, isAppOrigin } from './apps';
import { updateHandler } from './routes/update';
import { setRouteNameForStats } from './metrics/express';
import * as Sentry from '@sentry/node';

export const app = express();

app.set('trust proxy', true); // enable x-forwarded-for
app.set('x-powered-by', false);

// The request handler must be the first middleware on the app
app.use(
  Sentry.Handlers.requestHandler({
    user: ['bungieMembershipId'],
  })
);
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());
// The error handler must be before any other error middleware
app.use(Sentry.Handlers.errorHandler());

app.use(setRouteNameForStats); // fix path names for next middleware
app.use(metrics.helpers.getExpressMiddleware('http', { timeByUrl: true })); // metrics
app.use(morgan('combined')); // logging
app.use(express.json({ limit: '2mb' })); // for parsing application/json

/** CORS config that allows any origin to call */
const permissiveCors = cors({
  maxAge: 3600,
});

// These paths can be accessed by any caller
app.options('/', permissiveCors);
app.get('/', permissiveCors, (_, res) =>
  res.send({ message: 'Hello from DIM!!!' })
);
app.post('/', permissiveCors, (_, res) => res.status(404).send('Not Found'));
app.get('/favicon.ico', permissiveCors, (_, res) =>
  res.status(404).send('Not Found')
);

app.options('/platform_info', permissiveCors);
app.get('/platform_info', permissiveCors, platformInfoHandler);
app.options('/new_app', permissiveCors);
app.post('/new_app', permissiveCors, createAppHandler);

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
  if (
    req.dimApp &&
    req.headers.origin &&
    req.dimApp.origin !== req.headers.origin
  ) {
    console.warn(
      'OriginMismatch',
      req.dimApp?.id,
      req.dimApp?.origin,
      req.headers.origin
    );
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
    userProperty: 'jwt',
    algorithms: ['HS256'],
  })
);

// Copy info from the auth token into a "user" parameter on the request.
app.use((req, _, next) => {
  if (!req.jwt) {
    console.error('JWT expected', req.path);
    next(new Error('Expected JWT info'));
  } else {
    req.user = {
      bungieMembershipId: parseInt(req.jwt.sub, 10),
      dimApiKey: req.jwt.iss,
    };
    next();
  }
});

// Validate that the auth token and the API key in the header match.
app.use((req, res, next) => {
  if (req.dimApp && req.dimApp.dimApiKey !== req.jwt!.iss) {
    console.warn(
      'ApiKeyMismatch',
      req.dimApp?.id,
      req.dimApp?.dimApiKey,
      req.jwt!.iss
    );
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

app.use((err: Error, req, res, _next) => {
  Sentry.captureException(err);
  if (err.name === 'UnauthorizedError') {
    console.warn('Unauthorized', req.dimApp?.id, req.originalUrl, err);
    res.status(401).send({
      error: err.name,
      message: err.message,
    });
  } else {
    console.error(
      'ServerError',
      req.dimApp?.id,
      req.method,
      req.originalUrl,
      req.user?.bungieMembershipId,
      err
    );
    res.status(500).send({
      error: err.name,
      message: err.message,
    });
  }
});
