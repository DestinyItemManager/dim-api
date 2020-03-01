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
import { apiKey, getApps } from './apps';
import { updateHandler } from './routes/update';
import { auditLogHandler } from './routes/audit-log';

export const app = express();

app.use(metrics.helpers.getExpressMiddleware('http', { timeByUrl: true })); // metrics
app.use(morgan('combined')); // logging
app.use(express.json()); // for parsing application/json

/** CORS config that allows any origin to call */
const permissiveCors = cors({
  maxAge: 3600
});

// These paths can be accessed by any caller
app.get('/', permissiveCors, (_, res) =>
  res.send({ message: 'Hello from DIM!!!' })
);
app.get('/platform_info', permissiveCors, platformInfoHandler);
app.options('/new_app', permissiveCors);
app.post('/new_app', permissiveCors, createAppHandler);

/* ****** API KEY REQUIRED ****** */
/* Any routes declared below this will require an API Key in X-API-Key header */

app.use(apiKey);

// Use the DIM App looked up from the API Key to set the CORS header
const apiKeyCors = cors({
  origin: (origin, callback) => {
    getApps()
      .then((apps) => {
        if (!origin || apps.some((app) => app.origin === origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      })
      .catch(callback);
  }
});
app.use(apiKeyCors);

app.post('/auth/token', authTokenHandler);

/* ****** USER AUTH REQUIRED ****** */
/* Any routes declared below this will require an auth token */

app.all('*', jwt({ secret: process.env.JWT_SECRET!, userProperty: 'jwt' }));

// Copy info from the auth token into a "user" parameter on the request.
app.use((req, _, next) => {
  if (!req.jwt) {
    console.log('JWT expected', req.path);
    next(new Error('Expected JWT info'));
  } else {
    req.user = {
      bungieMembershipId: parseInt(req.jwt.sub, 10),
      dimApiKey: req.jwt.iss
    };
    next();
  }
});

// Validate that the auth token and the API key in the header match.
app.use((req, res, next) => {
  if (req.dimApp && req.dimApp.dimApiKey !== req.jwt!.iss) {
    res.status(401).send({
      error: 'ApiKeyMismatch',
      message:
        'The auth token was issued for a different app than the API key in X-API-Key indicates'
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
// Audit log
app.get('/audit', auditLogHandler);

// TODO: /audit_log

app.use((err: Error, _req, res, _next) => {
  if (err.name === 'UnauthorizedError') {
    res.status(401).send({
      error: err.name,
      message: err.message
    });
  } else {
    console.error('Error handling request', err);
    res.status(500).send({
      error: err.name,
      message: err.message
    });
  }
});
