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
  db.runSql(`ALTER TABLE searches ADD COLUMN search_type smallint NOT NULL DEFAULT 1;`, callback);
};

exports.down = function (db, callback) {
  db.runSql(`ALTER TABLE searches DROP COLUMN search_type;`, callback);
};

exports._meta = {
  version: 1,
};
