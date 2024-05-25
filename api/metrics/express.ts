import { Request, RequestHandler } from 'express';
import { StatsD } from 'hot-shots';

/**
 * A middleware that will log stats per path
 */
export default function expressStatsd({
  client,
  prefix,
}: {
  client: StatsD;
  prefix: string;
}): RequestHandler {
  return (req, res, next) => {
    const startTime = performance.now();

    // Function called on response finish that sends stats to statsd
    function sendStats() {
      const routeName = getRouteNameForStats(req);

      // Status Code
      const statusCode = res.statusCode || 'unknown_status';
      client.increment(prefix + '.response_code.' + routeName + '.' + statusCode);

      // Response Time
      const duration = performance.now() - startTime;
      client.timing(prefix + '.response_time.' + routeName, duration);

      cleanup();
    }

    // Function to clean up the listeners we've added
    function cleanup() {
      res.removeListener('finish', sendStats);
      res.removeListener('error', cleanup);
      res.removeListener('close', cleanup);
    }

    // Add response listeners
    res.once('finish', sendStats);
    res.once('error', cleanup);
    res.once('close', cleanup);

    if (next) {
      next();
    }
  };
}

// Removes ":", heading/trailing / and replaces / by _ in a given route name
function sanitize(routeName: string) {
  return routeName
    .replace(/[:?]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/^\/|\/$/g, '')
    .replace(/\//g, '_');
}

// Extracts a route name from the request or response and sets it for use by the statsd middleware
export function getRouteNameForStats(req: Request) {
  if (req.route?.path) {
    let routeName = req.route.path;
    if (Object.prototype.toString.call(routeName) === '[object RegExp]') {
      routeName = routeName.source;
    }

    if (req.baseUrl) {
      routeName = req.baseUrl + routeName;
    } else if (routeName === '/') {
      routeName = 'root';
    }

    const sanitizedRoute = sanitize(routeName);
    if (sanitizedRoute !== '') {
      return req.method + '_' + sanitizedRoute;
    }
  }

  return req.method + '_unknown_express_route'; //req.method + '_' + sanitize(req.path);
}
