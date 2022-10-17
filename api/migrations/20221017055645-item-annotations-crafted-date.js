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
  db.runSql(`ALTER TABLE item_annotations ADD COLUMN crafted_date timestamp;`, callback);
};

exports.down = function (db, callback) {
  db.runSql(`ALTER TABLE item_annotations DROP COLUMN crafted_date;`, callback);
};

exports._meta = {
  version: 1,
};
