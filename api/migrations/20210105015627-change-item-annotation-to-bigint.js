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
    `ALTER TABLE item_annotations ALTER COLUMN platform_membership_id TYPE bigint USING platform_membership_id::bigint, ALTER COLUMN inventory_item_id TYPE bigint USING inventory_item_id::bigint;`,
    callback
  );
};

exports.down = function (db, callback) {
  db.runSql(
    `ALTER TABLE item_annotations ALTER COLUMN platform_membership_id TYPE bigint USING platform_membership_id::text, ALTER COLUMN inventory_item_id TYPE text USING inventory_item_id::text;`,
    callback
  );
};

exports._meta = {
  version: 1,
};
