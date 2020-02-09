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
    `CREATE TABLE loadouts (
      id UUID PRIMARY KEY NOT NULL,
      membership_id int NOT NULL,
      platform_membership_id int NOT NULL,
      destiny_version smallint NOT NULL default 2,
      name text NOT NULL,
      class_type smallint NOT NULL default 3,
      emblem_hash int,
      clear_space boolean default false,
      /* Items in a loadout are just JSON */
      equipped jsonb NOT NULL default '[]'::jsonb,
      unequipped jsonb NOT NULL default '[]'::jsonb,
      created_at timestamp NOT NULL default current_timestamp,
      created_by text NOT NULL,
      last_updated_at timestamp NOT NULL default current_timestamp,
      last_updated_by text NOT NULL
    )

    /* The typical query to get all loadouts specifies both platform_membership_id and destiny_version. destiny_version is low-cardinality enough to not need to be indexed. */
    CREATE INDEX loadouts_by_platform_membership ON loadouts (platform_membership_id);
    `,
    callback
  );
};

exports.down = function(db, callback) {
  db.dropTable('loadouts', callback);
};

exports._meta = {
  version: 1
};
