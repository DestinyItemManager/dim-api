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

// TODO: Index on platform_membership_id to allow us to quickly find all loadouts for a given user.
exports.up = function (db, callback) {
  db.runSql(
    `CREATE TABLE loadout_shares (
      /*
      * A globally unique short random string to be used when sharing the loadout, but which is hard to guess.
      * This is essentially 35 random bits encoded via base32 into a 7-character string. It'd be neat if we could
      * support that, with a parameterizable string length.
      */
      id string NOT NULL,
      platform_membership_id bigint NOT NULL,
      destiny_version smallint NOT NULL default 2,
      membership_id int NOT NULL, /* Not especially useful but good to keep track of for emergencies */

      name text NOT NULL,
      notes text,
      class_type smallint NOT NULL default 3,
      /* Items in a loadout are just JSON */
      items jsonb NOT NULL default '{}'::jsonb,
      parameters jsonb,

      view_count int NOT NULL default 0,

      created_at timestamp NOT NULL default current_timestamp,
      last_updated_at timestamp NOT NULL default current_timestamp,
      deleted_at timestamp, /* soft delete timestamp */

      PRIMARY KEY(id)
    );

    CREATE TRIGGER
      loadout_shares_last_updated
    BEFORE UPDATE ON
      loadout_shares
    FOR EACH ROW EXECUTE PROCEDURE
      sync_lastmod();
    `,
    callback,
  );
};

exports.down = function (db, callback) {
  db.dropTable('loadout_shares', callback);
};

exports._meta = {
  version: 1,
};
