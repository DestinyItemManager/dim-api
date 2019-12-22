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
    `CREATE TABLE global_settings (
      dimApiEnabled boolean,
      dimProfileMinimumRefreshInterval int,
      destinyProfileRefreshInterval int,
      autoRefresh boolean
    );

    INSERT INTO global_settings
    (dimApiEnabled, dimProfileMinimumRefreshInterval, destinyProfileRefreshInterval, autoRefresh)
    VALUES
    (true, 300, 30, true);
    `,
    callback
  );
};

exports.down = function(db, callback) {
  db.dropTable('global_settings', callback);
};

exports._meta = {
  version: 1
};
