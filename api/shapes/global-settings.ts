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
  /** Whether to use dirty tricks to bust the Bungie.net cache when users manually refresh. */
  bustProfileCacheOnHardRefresh: boolean;
  /** Don't automatically refresh DIM profile info more often than this many seconds. */
  dimProfileMinimumRefreshInterval: number;
}

export const defaultGlobalSettings: GlobalSettings = {
  dimApiEnabled: true,
  destinyProfileMinimumRefreshInterval: 15,
  destinyProfileRefreshInterval: 30,
  autoRefresh: true,
  refreshProfileOnVisible: true,
  bustProfileCacheOnHardRefresh: false,
  dimProfileMinimumRefreshInterval: 300,
};

export interface PlatformInfoResponse {
  settings: GlobalSettings;
}
