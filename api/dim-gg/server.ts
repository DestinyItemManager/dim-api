import express from 'express';
import { metrics } from '../metrics';
import expressStatsd from '../metrics/express';
import { loadoutShareViewHandler } from './loadout-share-view';

/** dim.gg - DIM share links server */

export const app = express();

app.set('view engine', 'ejs');
app.set('views', './api/dim-gg/views');

app.use(expressStatsd({ client: metrics, prefix: 'dimgg' })); // metrics
app.use(express.json({ limit: '2mb' })); // for parsing application/json

// Redirect the root request to DIM's brochure page
// TODO: add some cache headers!
app.get('/', (_req, res) => {
  // Instruct CF to cache for 15 minutes
  res.set('Cache-Control', 'max-age=900');
  res.redirect('https://destinyitemmanager.com/');
});

// Loadout share preview/landing pages
app.get('/:shareId([a-z0-9]{7})/:titleSlug?', loadoutShareViewHandler);

// Serve static files (images, JS, etc from the dim-gg-static folder
// TODO: uniquely name these and then serve them with Cache-Control: Immutable
app.use(express.static('dim-gg-static', { maxAge: 900 }));
