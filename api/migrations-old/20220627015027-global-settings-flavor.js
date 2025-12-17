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
  db.runSql(`ALTER TABLE global_settings ADD COLUMN flavor text NOT NULL default 'app';`, callback);
};

exports.down = function (db, callback) {
  db.runSql(`ALTER TABLE global_settings DROP COLUMN flavor;`, callback);
};

exports._meta = {
  version: 1,
};
