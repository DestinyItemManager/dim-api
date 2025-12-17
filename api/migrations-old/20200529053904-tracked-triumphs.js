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

/**
 * Entries for each triumph tracked by a user. Presence in this table indicates the triumph
 * is tracked - otherwise it is simply missing.
 */
exports.up = function (db, callback) {
  db.runSql(
    `
    CREATE TABLE tracked_triumphs (
      membership_id int NOT NULL,
      platform_membership_id text NOT NULL,
      /* triumphs are only for D2 so we don't need a destiny_version column */
      record_hash bigint NOT NULL,
      created_at timestamp NOT NULL default current_timestamp,
      created_by text NOT NULL,
      /* Tracked triumphs can be different for different profiles */
      PRIMARY KEY(membership_id, platform_membership_id, record_hash)
    );
    `,
    callback
  );
};

exports.down = function (db, callback) {
  db.dropTable('tracked_triumphs', callback);
};

exports._meta = {
  version: 1,
};
