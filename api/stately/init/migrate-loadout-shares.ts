import { migrateLoadoutShareChunk } from '../migrator/loadout-shares.js';

while (true) {
  await migrateLoadoutShareChunk();
}
