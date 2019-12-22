import asyncHandler from 'express-async-handler';
import { pool } from '../db';

interface GlobalSettings {
  dimApiEnabled: boolean;
  dimProfileMinimumRefreshInterval: number;
  destinyProfileRefreshInterval: number;
  autoRefresh: boolean;
}

const defaultSettings: GlobalSettings = {
  dimApiEnabled: true,
  dimProfileMinimumRefreshInterval: 300,
  destinyProfileRefreshInterval: 30,
  autoRefresh: true
};

// TODO: middleware to validate the app parameter
export const platformInfoHandler = asyncHandler(async (_, res) => {
  /*
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM users WHERE id = $1', [1]);
    console.log(res.rows[0]);
  } finally {
    // Make sure to release the client before any error handling,
    // just in case the error handling itself throws an error.
    client.release();
  }
  */

  // TODO: load and merge in app-specific settings?
  const rows = await pool.query<GlobalSettings>(
    'SELECT * FROM global_settings'
  );

  res.send({
    settings: { ...defaultSettings, ...rows[0] }
  });
});
