// Sentry must be initialized before any other modules (express, http, pg) are
// loaded so its OpenTelemetry instrumentation can hook them. Load this file
// with `node --import ./api/instrument.js` rather than importing it.
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: process.env.COMMITHASH,
    // HTTP, Express, and Postgres tracing integrations are enabled by default
    tracesSampleRate: 0.001,
    maxValueLength: 10_000,
  });
}
