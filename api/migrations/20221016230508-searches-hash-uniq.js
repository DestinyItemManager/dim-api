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
    `create unique index searches_uniq on searches (membership_id, destiny_version, qhash);`,
    callback
  );
};

exports.down = function (db, callback) {
  db.runSql(`drop index searches_uniq;`, callback);
};
exports._meta = {
  version: 1,
};

// TODO: drop existing indexes after updating queries
