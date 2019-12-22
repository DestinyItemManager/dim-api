import { Pool } from 'pg';
import dbconfig from '../database.json';

// pools will use environment variables
// for connection information
export const pool = new Pool(dbconfig.dev);
