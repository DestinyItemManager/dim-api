import asyncHandler from 'express-async-handler';
import { pool } from '../db';

interface GlobalSettings {
  /** Whether to use the DIM API for  */
  dimApiEnabled: boolean;
  /** Don't allow refresh more often than this many seconds. */
  dimProfileMinimumRefreshInterval: number;
  /** Time in seconds to refresh the profile when autoRefresh is true. */
  destinyProfileRefreshInterval: number;
  /** Whether to refresh profile automatically. */
  autoRefresh: boolean;
  /** Whether to refresh profile when the page becomes visible after being in the background. */
  refreshProfileOnVisible: boolean;
  /** Whether to use dirty tricks to bust the Bungie.net cache when users manually refresh. */
  bustProfileCacheOnHardRefresh: boolean;
}

const defaultSettings: GlobalSettings = {
  dimApiEnabled: true,
  dimProfileMinimumRefreshInterval: 300,
  destinyProfileRefreshInterval: 30,
  autoRefresh: true,
  refreshProfileOnVisible: true,
  bustProfileCacheOnHardRefresh: false
};

// TODO: middleware to validate the app parameter
export const platformInfoHandler = asyncHandler(async (_, res) => {
  // TODO: load and merge in app-specific settings?
  const rows = await pool.query<GlobalSettings>(
    'SELECT * FROM global_settings'
  );

  res.send({
    settings: { ...defaultSettings, ...rows[0] }
  });
});
