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
    // Basically the same as loadouts, but indexed by a string ID. These are not intended to be mutable.
    `
    CREATE TABLE loadout_shares (
      id text NOT NULL,
      membership_id integer NOT NULL,
      platform_membership_id text NOT NULL,
      name text NOT NULL,
      notes text,
      class_type smallint NOT NULL DEFAULT 3,
      emblem_hash integer,
      clear_space boolean DEFAULT false,
      items jsonb NOT NULL DEFAULT '{}'::jsonb,
      parameters jsonb,
      created_at timestamp NOT NULL default current_timestamp,
      created_by text NOT NULL,
      last_accessed_at timestamp,
      visits integer NOT NULL default 0,
      PRIMARY KEY (id)
    );
    `,
    callback
  );
};

exports.down = function (db, callback) {
  db.dropTable('loadout_shares', callback);
};

exports._meta = {
  version: 1,
};
