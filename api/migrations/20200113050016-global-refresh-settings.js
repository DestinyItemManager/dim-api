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
  db.addColumn(
    'global_settings',
    'refreshProfileOnVisible',
    { type: 'boolean', defaultValue: false },
    callback
  );
  db.addColumn(
    'global_settings',
    'bustProfileCacheOnHardRefresh',
    { type: 'boolean', defaultValue: false },
    callback
  );
};

exports.down = function(db, callback) {
  db.removeColumn('global_settings', 'refreshProfileOnVisible', callback);
  db.removeColumn('global_settings', 'bustProfileCacheOnHardRefresh', callback);
};

exports._meta = {
  version: 1
};
