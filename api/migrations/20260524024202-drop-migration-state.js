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
  db.dropTable('migration_state', callback);
};

exports.down = function (db, callback) {
  db.runSql(
    `CREATE TABLE migration_state (
      platform_membership_id bigint NOT NULL PRIMARY KEY,
      membership_id int, /* Not especially useful but good to keep track of for emergencies */
      state smallint NOT NULL default 1,
      last_state_change_at timestamptz NOT NULL default current_timestamp,
      attempt_count int NOT NULL default 0,
      last_error text,
      created_at timestamptz NOT NULL default current_timestamp,
      last_updated_at timestamptz NOT NULL default current_timestamp
    );

    CREATE INDEX migration_state_pending_idx ON migration_state (state, attempt_count)
    INCLUDE (platform_membership_id)
    WHERE state = 1 AND attempt_count < 3;

    CREATE TRIGGER
      migration_state_last_updated
    BEFORE UPDATE ON
      migration_state
    FOR EACH ROW EXECUTE PROCEDURE
      sync_lastmod();
    `,
    callback,
  );
};

exports._meta = {
  version: 1,
};
