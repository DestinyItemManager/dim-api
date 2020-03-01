import { pool, transaction, readTransaction } from '.';

beforeEach(async () => {
  try {
    await pool.query(`DROP TABLE transaction_test`);
  } catch {}
  await pool.query(`CREATE TABLE transaction_test (
    id int PRIMARY KEY NOT NULL,
    test text
  )`);
});

afterAll(async () => {
  try {
    await pool.query(`DROP TABLE transaction_test`);
  } catch {}
  await pool.end();
});

describe('transaction', () => {
  it('rolls back on errors', async () => {
    await pool.query(
      "insert into transaction_test (id, test) values (1, 'testing')"
    );

    try {
      await transaction(async (client) => {
        await client.query(
          "insert into transaction_test (id, test) values (2, 'testing')"
        );
        throw new Error('oops');
      });
      fail('should have thrown an error');
    } catch (e) {
      expect(e.message).toBe('oops');
    }

    const result = await pool.query('select * from transaction_test');
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].id).toBe(1);
  });

  it('commits automatically', async () => {
    await transaction(async (client) => {
      await client.query(
        "insert into transaction_test (id, test) values (3, 'testing commits')"
      );
    });

    const result = await pool.query('select * from transaction_test');
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].test).toBe('testing commits');
  });
});

describe('readTransaction', () => {
  it('has read-committed isolation', async () => {
    await pool.query(
      "insert into transaction_test (id, test) values (1, 'testing')"
    );

    await readTransaction(async (client) => {
      // In a different client, update a row
      const otherClient = await pool.connect();
      try {
        await otherClient.query('BEGIN');

        await otherClient.query(
          "update transaction_test set test = 'updated' where id = 1"
        );

        // Now request that info from our original client.
        // should be read-committed, so we shouldn't see that update
        const result = await client.query(
          'select * from transaction_test where id = 1'
        );
        expect(result.rows[0].test).toBe('testing');

        // Commit the update
        await otherClient.query('COMMIT');
      } catch (e) {
        await otherClient.query('ROLLBACK');
        throw e;
      } finally {
        otherClient.release();
      }

      // once that other transaction commits, we'll see its update
      const result = await client.query(
        'select * from transaction_test where id = 1'
      );
      expect(result.rows[0].test).toBe('updated');
    });

    // outside, we should still see the transactional update
    const result = await pool.query(
      'select * from transaction_test where id = 1'
    );
    expect(result.rows[0].test).toBe('updated');
  });
});
