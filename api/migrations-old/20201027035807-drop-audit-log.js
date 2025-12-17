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
  return db.dropTable('audit_log', callback);
};

exports.down = function (db, callback) {
  db.runSql(
    `
    CREATE TABLE audit_log (
      membership_id int NOT NULL,
      id SERIAL NOT NULL,
      platform_membership_id text,
      destiny_version smallint NOT NULL default 2,
      type text NOT NULL,
      entry jsonb NOT NULL,
      created_at timestamp NOT NULL default current_timestamp,
      created_by text NOT NULL,
      /* tags are unique by membership ID and inventory item ID - effectively they're scoped by user */
      PRIMARY KEY(membership_id, id)
    );

    /* Add an index on date */
    CREATE INDEX audit_log_by_time ON audit_log (membership_id, created_at);
    `,
    callback
  );
};

exports._meta = {
  version: 1,
};
