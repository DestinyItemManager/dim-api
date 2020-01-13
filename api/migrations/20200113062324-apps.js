'use strict';

var dbm;
var type;
var seed;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db, callback) {
  db.runSql(
    `CREATE TABLE apps (
      id text PRIMARY KEY NOT NULL,
      bungie_api_key text NOT NULL,
      dim_api_key UUID NOT NULL
    );
    `,
    callback
  );
};

exports.down = function(db, callback) {
  db.dropTable('apps', callback);
};

exports._meta = {
  version: 1
};
