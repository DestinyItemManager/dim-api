import { itemType } from '@stately-cloud/schema';
import { DestinyVersion, HashID, ProfileID } from './types.js';

/**
 * Triumph stores a single record hash for a tracked triumph. Users can have any
 * number of tracked triumphs, with one item per triumph.
 */
export const Triumph = itemType('Triumph', {
  keyPath: '/p-:profileId/d-:destinyVersion/triumph-:recordHash',
  fields: {
    recordHash: { type: HashID },
    profileId: { type: ProfileID },

    // This is always "2" but we can't have constants in key paths
    destinyVersion: { type: DestinyVersion },
  },
});
