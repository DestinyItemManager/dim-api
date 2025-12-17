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
      membership_id int PRIMARY KEY NOT NULL,
      state smallint NOT NULL default 1,
      last_state_change_at timestamp NOT NULL default current_timestamp,
      attempt_count int NOT NULL default 0,
      last_error text,
      created_at timestamp NOT NULL default current_timestamp,
      last_updated_at timestamp NOT NULL default current_timestamp
    );
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
