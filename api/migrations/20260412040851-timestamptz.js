'use strict';

var dbm;
var type;
var seed;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db, callback) {
  db.runSql(
    `
    ALTER TABLE apps
      ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

    ALTER TABLE settings
      ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN last_updated_at TYPE timestamptz USING last_updated_at AT TIME ZONE 'UTC',
      ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'UTC';

    ALTER TABLE loadouts
      ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN last_updated_at TYPE timestamptz USING last_updated_at AT TIME ZONE 'UTC',
      ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'UTC';

    ALTER TABLE item_annotations
      ALTER COLUMN crafted_date TYPE timestamptz USING crafted_date AT TIME ZONE 'UTC',
      ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN last_updated_at TYPE timestamptz USING last_updated_at AT TIME ZONE 'UTC',
      ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'UTC';

    ALTER TABLE tracked_triumphs
      ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN last_updated_at TYPE timestamptz USING last_updated_at AT TIME ZONE 'UTC',
      ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'UTC';

    ALTER TABLE searches
      ALTER COLUMN last_used TYPE timestamptz USING last_used AT TIME ZONE 'UTC',
      ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN last_updated_at TYPE timestamptz USING last_updated_at AT TIME ZONE 'UTC',
      ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'UTC';

    ALTER TABLE item_hash_tags
      ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN last_updated_at TYPE timestamptz USING last_updated_at AT TIME ZONE 'UTC',
      ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'UTC';

    ALTER TABLE loadout_shares
      ALTER COLUMN last_accessed_at TYPE timestamptz USING last_accessed_at AT TIME ZONE 'UTC',
      ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN last_updated_at TYPE timestamptz USING last_updated_at AT TIME ZONE 'UTC',
      ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'UTC';

    ALTER TABLE migration_state
      ALTER COLUMN last_state_change_at TYPE timestamptz USING last_state_change_at AT TIME ZONE 'UTC',
      ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN last_updated_at TYPE timestamptz USING last_updated_at AT TIME ZONE 'UTC';

    ALTER TABLE session
      ALTER COLUMN expire TYPE timestamptz(6) USING expire AT TIME ZONE 'UTC';
    `,
    callback,
  );
};

exports.down = function (db, callback) {
  db.runSql(
    `
    ALTER TABLE session
      ALTER COLUMN expire TYPE timestamp(6) USING expire AT TIME ZONE 'UTC';

    ALTER TABLE migration_state
      ALTER COLUMN last_state_change_at TYPE timestamp USING last_state_change_at AT TIME ZONE 'UTC',
      ALTER COLUMN created_at TYPE timestamp USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN last_updated_at TYPE timestamp USING last_updated_at AT TIME ZONE 'UTC';

    ALTER TABLE loadout_shares
      ALTER COLUMN last_accessed_at TYPE timestamp USING last_accessed_at AT TIME ZONE 'UTC',
      ALTER COLUMN created_at TYPE timestamp USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN last_updated_at TYPE timestamp USING last_updated_at AT TIME ZONE 'UTC',
      ALTER COLUMN deleted_at TYPE timestamp USING deleted_at AT TIME ZONE 'UTC';

    ALTER TABLE item_hash_tags
      ALTER COLUMN created_at TYPE timestamp USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN last_updated_at TYPE timestamp USING last_updated_at AT TIME ZONE 'UTC',
      ALTER COLUMN deleted_at TYPE timestamp USING deleted_at AT TIME ZONE 'UTC';

    ALTER TABLE searches
      ALTER COLUMN last_used TYPE timestamp USING last_used AT TIME ZONE 'UTC',
      ALTER COLUMN created_at TYPE timestamp USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN last_updated_at TYPE timestamp USING last_updated_at AT TIME ZONE 'UTC',
      ALTER COLUMN deleted_at TYPE timestamp USING deleted_at AT TIME ZONE 'UTC';

    ALTER TABLE tracked_triumphs
      ALTER COLUMN created_at TYPE timestamp USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN last_updated_at TYPE timestamp USING last_updated_at AT TIME ZONE 'UTC',
      ALTER COLUMN deleted_at TYPE timestamp USING deleted_at AT TIME ZONE 'UTC';

    ALTER TABLE item_annotations
      ALTER COLUMN crafted_date TYPE timestamp USING crafted_date AT TIME ZONE 'UTC',
      ALTER COLUMN created_at TYPE timestamp USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN last_updated_at TYPE timestamp USING last_updated_at AT TIME ZONE 'UTC',
      ALTER COLUMN deleted_at TYPE timestamp USING deleted_at AT TIME ZONE 'UTC';

    ALTER TABLE loadouts
      ALTER COLUMN created_at TYPE timestamp USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN last_updated_at TYPE timestamp USING last_updated_at AT TIME ZONE 'UTC',
      ALTER COLUMN deleted_at TYPE timestamp USING deleted_at AT TIME ZONE 'UTC';

    ALTER TABLE settings
      ALTER COLUMN created_at TYPE timestamp USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN last_updated_at TYPE timestamp USING last_updated_at AT TIME ZONE 'UTC',
      ALTER COLUMN deleted_at TYPE timestamp USING deleted_at AT TIME ZONE 'UTC';

    ALTER TABLE apps
      ALTER COLUMN created_at TYPE timestamp USING created_at AT TIME ZONE 'UTC';
    `,
    callback,
  );
};

exports._meta = {
  version: 1,
};
