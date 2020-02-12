import { Pool, ClientBase } from 'pg';

// pools will use environment variables
// for connection information (from .env or a ConfigMap)
export const pool = new Pool();

/**
 * A helper that gets a connection from the pool and then executes fn within a transaction.
 */
export async function transaction(fn: (client: ClientBase) => Promise<any>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await fn(client);

    await client.query('COMMIT');
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
export async function readTransaction(
  fn: (client: ClientBase) => Promise<any>
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await fn(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}
