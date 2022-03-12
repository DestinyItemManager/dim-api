const http = require('http');
import { createTerminus } from '@godaddy/terminus';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import express from 'express';
import morgan from 'morgan';
import vhost from 'vhost';
import { refreshApps, stopAppsRefresh } from './apps';
import { pool } from './db';
import { app as dimGgApp } from './dim-gg/server';
import { metrics } from './metrics';
import { app as dimApiApp } from './server';

const port = 3000;

metrics.increment('startup.count', 1);

const app = express();

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
app.use(morgan('combined')); // logging

// In dev, edit .env to serve only one vhost
switch (process.env.VHOST) {
  case 'api.destinyitemmanager.com':
    app.use(dimApiApp);
    break;

  case 'dim.gg':
    app.use(dimGgApp);
    break;

  default:
    {
      // The DIM API (DIM sync)
      app.use(vhost('api.destinyitemmanager.com', dimApiApp));
      // dim.gg is both a redirect, and a shortlink service
      app.use(vhost('dim.gg', dimGgApp));
      // These are just redirects (for now?)
      app.use(
        vhost('beta.dim.gg', (req, res) => {
          // Instruct CF to cache for 15 minutes
          res.set('Cache-Control', 'max-age=900');
          res.redirect('https://beta.destinyitemmanager.com' + req.originalUrl);
        })
      );
      app.use(
        vhost('app.dim.gg', (req, res) => {
          // Instruct CF to cache for 15 minutes
          res.set('Cache-Control', 'max-age=900');
          res.redirect('https://app.destinyitemmanager.com' + req.originalUrl);
        })
      );
    }
    break;
}

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: process.env.COMMITHASH,
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Tracing.Integrations.Express({
        // to trace all requests to the default router
        app,
        // alternatively, you can specify the routes you want to trace:
        // router: someRouter,
      }),
      new Tracing.Integrations.Postgres(),
    ],
    tracesSampleRate: 0.001,
  });
}

const server = http.createServer(app);

function beforeShutdown() {
  const shutdownTime = process.env.NODE_ENV === 'production' ? 10000 : 100;
  console.log('Wait', shutdownTime, 'ms before shutdown');
  // allow readiness probes to notice things are down
  return new Promise((resolve) => {
    setTimeout(resolve, shutdownTime);
  });
}

async function healthCheck() {
  return;
}
createTerminus(server, {
  healthChecks: {
    '/healthcheck': healthCheck,
  },
  beforeShutdown,
  onShutdown: async () => {
    console.log('Shutting down');
    stopAppsRefresh();
    pool.end();
  },
});

refreshApps()
  .then(() => {
    server.listen(port, () => console.log(`DIM API started up on port ${port}`));
  })
  .catch((e) => {
    console.log('Unable to load apps', e);
    throw e;
  });
