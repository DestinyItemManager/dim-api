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
    `ALTER TABLE global_settings ADD COLUMN show_issue_banner boolean NOT NULL default false;`,
    callback
  );
};

exports.down = function (db, callback) {
  db.runSql(
    `ALTER TABLE global_settings DROP COLUMN show_issue_banner;`,
    callback
  );
};

exports._meta = {
  version: 1,
};
