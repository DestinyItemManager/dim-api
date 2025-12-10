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
    // Run at 1:10am Pacific on Monday, delete old one-time use searches
    `SELECT cron.schedule('old-searches', '10 8 * * 1', $$delete from searches where usage_count = 1 and saved = false and last_used < now() - interval '6 month';$$);`,
    callback
  );
};

exports.down = function (db) {
  db.runSql(`cron.unschedule('old-searches')`, callback);
};

exports._meta = {
  version: 1,
};
