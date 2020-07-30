const http = require('http');
import { app } from './server';
import { metrics } from './metrics';
import { createTerminus } from '@godaddy/terminus';
import { pool } from './db';
import { stopAppsRefresh, refreshApps } from './apps';
import * as Sentry from '@sentry/node';

const port = 3000;

metrics.increment('startup.count', 1);

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: process.env.COMMITHASH,
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

refreshApps().then(() => {
  server.listen(port, () => console.log(`DIM API started up on port ${port}`));
});
