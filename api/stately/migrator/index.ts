import * as Sentry from '@sentry/node';
import { migrateLoadoutShareChunk } from './loadout-shares.js';

export function startMigrator() {
  setInterval(async () => {
    try {
      await migrateLoadoutShareChunk();
    } catch (e) {
      Sentry.captureException(e, {
        extra: { context: 'migrateLoadoutShareChunk' },
      });
    }
  }, 30_000);
}
