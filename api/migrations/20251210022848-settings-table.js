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

/**
 * The settings table stores its data in a single JSONB column. This allows us to easily
 * add and remove settings, and to only store settings that differ from the defaults.
 */
exports.up = function (db, callback) {
  // TODO: Maybe users should be linked to memberships? Add a profile IDs array column? Or just have a mapping table...
  db.runSql(
    `CREATE TABLE settings (
      membership_id int PRIMARY KEY NOT NULL,
      settings jsonb NOT NULL default '{}'::jsonb,
      created_at timestamp NOT NULL default current_timestamp,
      last_updated_at timestamp NOT NULL default current_timestamp,
      deleted_at timestamp /* soft delete timestamp, applies to the whole account */
    )`,
    callback,
  );
};

exports.down = function (db, callback) {
  db.dropTable('settings', callback);
};

exports._meta = {
  version: 1,
};
