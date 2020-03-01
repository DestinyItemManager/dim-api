import { Pool, ClientBase } from 'pg';

// pools will use environment variables
// for connection information (from .env or a ConfigMap)
export const pool = new Pool({
  max: 6 // We get 25 connections per 1GB of RAM, minus 3 connections for maintenance. We run 3 DIM services.
});

/**
 * A helper that gets a connection from the pool and then executes fn within a transaction.
 */
export async function transaction<T>(fn: (client: ClientBase) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await fn(client);

    await client.query('COMMIT');

    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * A helper that gets a connection from the pool and then executes fn within a transaction that's only meant for reads.
 */
export async function readTransaction<T>(
  fn: (client: ClientBase) => Promise<T>
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    return await fn(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}
