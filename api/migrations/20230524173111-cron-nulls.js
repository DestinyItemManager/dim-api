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
    // Run at 1am Pacific on Monday, delete all tags where both notes and tag is null
    `SELECT cron.schedule('null-tags', '0 8 * * 1', $$delete from item_annotations where notes is null and tag is null$$);`,
    callback
  );
};

exports.down = function (db) {
  db.runSql(`cron.unschedule('null-tags')`, callback);
};

exports._meta = {
  version: 1,
};
