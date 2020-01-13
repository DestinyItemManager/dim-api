import { Pool } from 'pg';

// pools will use environment variables
// for connection information (from .env or a ConfigMap)
export const pool = new Pool();
