const http = require('http');
import { app } from './server';
import { metrics } from './metrics';
import { createTerminus } from '@godaddy/terminus';

const port = 3000;

metrics.increment('startup', 1);

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
    '/healthcheck': healthCheck
  },
  beforeShutdown,
  onShutdown: async () => console.log('Shutting down')
});

server.listen(port, () => console.log(`DIM API started up on port ${port}`));
