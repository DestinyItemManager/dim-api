import { Pool, PoolConfig } from 'pg';
import dbconfig from '../database.json';

const config: PoolConfig =
  process.env.POSTGRES_SERVICE_HOST && process.env.POSTGRES_SERVICE_PORT
    ? {
        ...dbconfig.dev,
        host: process.env.POSTGRES_SERVICE_HOST,
        port: parseInt(process.env.POSTGRES_SERVICE_PORT)
      }
    : dbconfig.dev;

// pools will use environment variables
// for connection information
export const pool = new Pool(config);
