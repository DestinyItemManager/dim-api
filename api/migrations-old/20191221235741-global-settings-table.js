'use strict';

let dbm;
let type;
let seed;

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
      dim_api_enabled boolean,
      destiny_profile_minimum_refresh_interval int,
      destiny_profile_refresh_interval int,
      auto_refresh boolean,
      refresh_profile_on_visible boolean,
      bust_profile_cache_on_hard_refresh boolean
    );

    INSERT INTO global_settings
    (dim_api_enabled, destiny_profile_minimum_refresh_interval, destiny_profile_refresh_interval, auto_refresh, refresh_profile_on_visible, bust_profile_cache_on_hard_refresh)
    VALUES
    (true, 15, 30, false, true, false);
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
