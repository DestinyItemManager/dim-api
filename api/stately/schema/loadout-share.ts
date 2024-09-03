import { itemType, string } from '@stately-cloud/schema';
import { loadoutFields } from './loadouts.js';

export const LoadoutShare = itemType('LoadoutShare', {
  // We put this under a profile and a destiny version so we can get all
  // loadouts for a particular destiny version in one query
  keyPath: [
    '/loadoutShare-:id',
    // TODO: It'd be neat to store a compact pointer back to this under the
    // user's profile, so we could list out shares. Maybe just an ID pointer,
    // maybe project in the name as well...
    // {path: "/p-:profileId/d-:destinyVersion/loadoutShare-:id", type: 'pointer' },
  ],
  fields: {
    /**
     * A globally unique short random string to be used when sharing the loadout, but which is hard to guess.
     * This is essentially 35 random bits encoded via base32 into a 7-character string. It'd be neat if we could
     * support that, with a parameterizable string length.
     */
    id: { type: string, fieldNum: 1 /* initialValue: 'rand35str' */ },
    ...loadoutFields,

    // TODO: Where's the view-counter?
  },
});
