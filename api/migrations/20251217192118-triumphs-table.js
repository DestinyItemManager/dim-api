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
      record_hash bigint NOT NULL,
      platform_membership_id bigint NOT NULL,
      membership_id int NOT NULL, /* Not especially useful but good to keep track of for emergencies */
      /* triumphs are only for D2 so we don't need a destiny_version column */

      created_at timestamp NOT NULL default current_timestamp,
      last_updated_at timestamp NOT NULL default current_timestamp,
      deleted_at timestamp, /* soft delete timestamp */

      /* Tracked triumphs can be different for different profiles */
      PRIMARY KEY(platform_membership_id, record_hash)
    );

    CREATE TRIGGER
      tracked_triumphs_last_updated
    BEFORE UPDATE ON
      tracked_triumphs
    FOR EACH ROW EXECUTE PROCEDURE
      sync_lastmod();
    `,
    callback,
  );
};

exports.down = function (db, callback) {
  db.dropTable('tracked_triumphs', callback);
};

exports._meta = {
  version: 1,
};
