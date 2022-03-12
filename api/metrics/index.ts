import SDC from 'hot-shots';

export const metrics = new SDC({
  prefix: 'dim-api.',
  host: process.env.GRAPHITE_SERVICE_HOST || 'localhost',
  port: process.env.GRAPHITE_SERVICE_PORT_STATSD
    ? parseInt(process.env.GRAPHITE_SERVICE_PORT_STATSD)
    : 31202,
});
