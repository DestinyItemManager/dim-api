import { RequestHandler } from 'express';

// Removes ":", heading/trailing / and replaces / by _ in a given route name
function sanitize(routeName: string) {
  return routeName
    .replace(/:/g, '')
    .replace(/^\/|\/$/g, '')
    .replace(/\//g, '_');
}

// Extracts a route name from the request or response and sets it for use by the statsd middleware
export const setRouteNameForStats: RequestHandler = (req, res, next) => {
  if (req.route && req.route.path) {
    let routeName = req.route.path;
    if (Object.prototype.toString.call(routeName) === '[object RegExp]') {
      routeName = routeName.source;
    }

    if (req.baseUrl) {
      routeName = req.baseUrl + routeName;
    } else if (routeName === '/') {
      routeName = 'root';
    }

    if (req.params) {
      Object.keys(req.params).forEach(function (key) {
        if (req.params[key] === '') {
          return;
        }
        routeName = routeName.replace(req.params[key], ':' + key);
      });
    }

    const sanitizedRoute = sanitize(routeName);
    if (sanitizedRoute !== '') {
      res.locals.statsdUrlKey = req.method + '_' + sanitizedRoute;
      next();
      return;
    }
  }

  res.locals.statsdUrlKey = req.method + '_' + sanitize(req.path);
  next();
};
