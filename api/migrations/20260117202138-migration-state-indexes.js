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
    `ALTER TABLE migration_state ADD PRIMARY KEY (platform_membership_id);

    CREATE INDEX migration_state_pending_idx ON migration_state (state, attempt_count)
    INCLUDE (platform_membership_id)
    WHERE state = 1 AND attempt_count < 3;`,
    callback,
  );
};

exports.down = function (db, callback) {
  db.runSql(
    `DROP INDEX IF EXISTS migration_state_pending_idx;

    ALTER TABLE migration_state DROP CONSTRAINT migration_state_pkey;`,
    callback,
  );
};

exports._meta = {
  version: 1,
};
