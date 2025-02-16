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
    stage: { type: string },
    /** Whether the API is enabled or not.  */
    dimApiEnabled: { type: bool },
    /** Don't allow refresh more often than this many seconds. */
    destinyProfileMinimumRefreshInterval: { type: durationSeconds },
    /** Time in seconds to refresh the profile when autoRefresh is true. */
    destinyProfileRefreshInterval: { type: durationSeconds },
    /** Whether to refresh profile automatically. */
    autoRefresh: { type: bool },
    /** Whether to refresh profile when the page becomes visible after being in the background. */
    refreshProfileOnVisible: { type: bool },
    /** Don't automatically refresh DIM profile info more often than this many seconds. */
    dimProfileMinimumRefreshInterval: { type: durationSeconds },
    /** Display an issue banner, if there is one. */
    showIssueBanner: { type: bool },

    lastUpdated: { type: timestampMilliseconds, fromMetadata: 'lastModifiedAtTime' },
  },
});
