import { itemType } from '@stately-cloud/schema';
import { DestinyVersion, HashID, ProfileID } from './types.js';

/**
 * Triumph stores a single record hash for a tracked triumph. Users can have any
 * number of tracked triumphs, with one item per triumph.
 */
export const Triumph = itemType('Triumph', {
  keyPath: '/p-:profileId/d-:destinyVersion/triumph-:recordHash',
  fields: {
    recordHash: { type: HashID, fieldNum: 1 },
    profileId: { type: ProfileID, fieldNum: 2 },

    // This is always "2"
    destinyVersion: {
      type: DestinyVersion,
      fieldNum: 7,
    },
  },
});
