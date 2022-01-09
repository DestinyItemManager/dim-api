import express from 'express';
import { metrics } from '../metrics';
import { setRouteNameForStats } from '../metrics/express';

/** dim.gg - DIM share links server */

export const app = express();

app.set('view engine', 'ejs');
app.set('views', './api/dim-gg/views');

app.use(setRouteNameForStats); // fix path names for next middleware
app.use(metrics.helpers.getExpressMiddleware('dimgg', { timeByUrl: true })); // metrics
app.use(express.json({ limit: '2mb' })); // for parsing application/json

// Redirect the root request to DIM's brochure page
app.get('/', (_req, res) => res.redirect('https://destinyitemmanager.com/'));

// TODO: This is where we can put special loadout link pages!

// A test path, just to demonstrate templates
app.get('/test', (_req, res) => {
  // TODO: we could get fancy and use server-side react here, or we could just use simple templates
  res.render('test', { now: Date.now() });
});

// Serve static files (images, JS, etc from the dim-gg-static folder
app.use(express.static('dim-gg-static'));
