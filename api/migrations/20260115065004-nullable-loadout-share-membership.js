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

// Old shares that were in Stately don't have membership_id filled out.
exports.up = function (db, callback) {
  db.runSql(
    `alter table loadout_shares
      alter column membership_id drop not null;`,
    callback,
  );
};

exports.down = function (db, callback) {
  db.runSql(
    `alter table loadout_shares
      alter column membership_id set not null;`,
    callback,
  );
};

exports._meta = {
  version: 1,
};
