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
  db.runSql(`ALTER TABLE searches drop constraint searches_pkey;`, callback);
};

exports.down = function (db, callback) {
  db.runSql(
    `ALTER TABLE searches add ADD PRIMARY KEY(membership_id, destiny_version, query);`,
    callback
  );
};

exports._meta = {
  version: 1,
};
