export interface GlobalSettings {
  /** Whether to use the DIM API for  */
  dimApiEnabled: boolean;
  /** Don't allow refresh more often than this many seconds. */
  destinyProfileMinimumRefreshInterval: number;
  /** Time in seconds to refresh the profile when autoRefresh is true. */
  destinyProfileRefreshInterval: number;
  /** Whether to refresh profile automatically. */
  autoRefresh: boolean;
  /** Whether to refresh profile when the page becomes visible after being in the background. */
  refreshProfileOnVisible: boolean;
  /** Don't automatically refresh DIM profile info more often than this many seconds. */
  dimProfileMinimumRefreshInterval: number;
  /** Display an issue banner, if there is one. */
  showIssueBanner: boolean;
  /** The unix milliseconds timestamp for when this was last updated. */
  lastUpdated: number;
}

export const defaultGlobalSettings: GlobalSettings = {
  dimApiEnabled: true,
  destinyProfileMinimumRefreshInterval: 15,
  destinyProfileRefreshInterval: 120,
  autoRefresh: true,
  refreshProfileOnVisible: true,
  dimProfileMinimumRefreshInterval: 1,
  showIssueBanner: false,
  lastUpdated: 0,
};

export interface PlatformInfoResponse {
  settings: GlobalSettings;
}
