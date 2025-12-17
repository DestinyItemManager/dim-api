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
    `CREATE INDEX item_annotations_by_pm_id ON item_annotations (platform_membership_id);`,
    () =>
      db.runSql(`DROP INDEX item_annotations_by_platform_membership;`, callback)
  );
};

exports.down = function (db, callback) {
  db.runSql(
    `CREATE INDEX item_annotations_by_platform_membership ON item_annotations (membership_id, platform_membership_id);`,
    () => db.runSql(`DROP INDEX item_annotations_by_pm_id;`, callback)
  );
};

exports._meta = {
  version: 1,
};
