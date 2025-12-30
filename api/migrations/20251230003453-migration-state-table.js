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
    `CREATE TABLE migration_state (
      platform_membership_id bigint NOT NULL,
      membership_id int NOT NULL, /* Not especially useful but good to keep track of for emergencies */
      state smallint NOT NULL default 1,
      last_state_change_at timestamp NOT NULL default current_timestamp,
      attempt_count int NOT NULL default 0,
      last_error text,
      created_at timestamp NOT NULL default current_timestamp,
      last_updated_at timestamp NOT NULL default current_timestamp
    );

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

exports.down = function (db, callback) {
  db.dropTable('migration_state', callback);
};

exports._meta = {
  version: 1,
};
