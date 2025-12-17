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
    // Run at 1:30am Pacific on Monday, delete loadout shares that were never used
    `SELECT cron.schedule('unused-loadout-shares', '30 8 * * 1', $$delete from loadout_shares where visits = 0 and created_at < now() - interval '1 week';$$);`,
    callback
  );
};

exports.down = function (db) {
  db.runSql(`cron.unschedule('unused-loadout-shares')`, callback);
};

exports._meta = {
  version: 1,
};
