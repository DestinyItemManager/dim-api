import { itemType, string, type } from '@stately-cloud/schema';

// A UUID stored as a string. This is inefficient, but we always use them as
// strings in this API.
const uuidString = type('uuidString', string, {
  // Copied from protovalidate
  valid:
    "this.matches('^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')",
});

// "apps" aren't exposed to users - they're periodically synced by server instances.
export const ApiApp = itemType('ApiApp', {
  keyPath: '/apps/app-:id',
  fields: {
    /** A short ID that uniquely identifies the app. */
    id: { type: string, fieldNum: 1 },
    /** Apps must share their Bungie.net API key with us. */
    bungieApiKey: { type: string, fieldNum: 2 },
    /** Apps also get a generated API key for accessing DIM APIs that don't involve user data. */
    dimApiKey: {
      type: uuidString,
      fieldNum: 3 /* initialValue: 'uuid' Sad, I actually wanted this to be a new random UUID on insert */,
    },
    /** The origin used to allow CORS for this app. Only requests from this origin are allowed. */
    origin: { type: string, fieldNum: 4 },
  },
});
