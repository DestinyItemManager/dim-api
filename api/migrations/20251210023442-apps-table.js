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
    `CREATE TABLE apps (
      id UUID PRIMARY KEY NOT NULL default gen_random_uuid(),
      bungie_api_key text NOT NULL,
      dim_api_key UUID NOT NULL,
      origin text NOT NULL,
      created_at timestamp NOT NULL default current_timestamp
    );
    `,
    callback,
  );
};

exports.down = function (db, callback) {
  db.dropTable('apps', callback);
};

exports._meta = {
  version: 1,
};
