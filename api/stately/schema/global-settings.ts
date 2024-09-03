import {
  bool,
  durationSeconds,
  itemType,
  string,
  timestampMilliseconds,
} from '@stately-cloud/schema';

// Clients load these settings from the server on startup. They change infrequently and are super cache-able.
export const GlobalSettings = itemType('GlobalSettings', {
  keyPath: '/gs-:stage',
  fields: {
    stage: { type: string, fieldNum: 1 },
    /** Whether the API is enabled or not.  */
    dimApiEnabled: { type: bool, fieldNum: 2, required: false },
    /** Don't allow refresh more often than this many seconds. */
    destinyProfileMinimumRefreshInterval: { type: durationSeconds, fieldNum: 3 },
    /** Time in seconds to refresh the profile when autoRefresh is true. */
    destinyProfileRefreshInterval: { type: durationSeconds, fieldNum: 4 },
    /** Whether to refresh profile automatically. */
    autoRefresh: { type: bool, fieldNum: 5, required: false },
    /** Whether to refresh profile when the page becomes visible after being in the background. */
    refreshProfileOnVisible: { type: bool, fieldNum: 6, required: false },
    /** Don't automatically refresh DIM profile info more often than this many seconds. */
    dimProfileMinimumRefreshInterval: { type: durationSeconds, fieldNum: 7 },
    /** Display an issue banner, if there is one. */
    showIssueBanner: { type: bool, fieldNum: 8, required: false },

    lastUpdated: { type: timestampMilliseconds, fieldNum: 9, fromMetadata: 'lastModifiedAtTime' },
  },
});
