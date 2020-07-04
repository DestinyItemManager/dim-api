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
    // Searches are stored per-destiny-version, but not per-account
    `
    CREATE TABLE searches (
      membership_id int NOT NULL,
      destiny_version smallint NOT NULL default 2,
      query text NOT NULL,
      saved boolean NOT NULL default false,
      usage_count int NOT NULL default 1,
      last_used timestamp NOT NULL default current_timestamp,
      created_at timestamp NOT NULL default current_timestamp,
      created_by text NOT NULL,
      last_updated_at timestamp NOT NULL default current_timestamp,
      last_updated_by text NOT NULL,
      PRIMARY KEY(membership_id, destiny_version, query)
    );

    /* The typical query to get all searches specifies both platform_membership_id and destiny_version. destiny_version is low-cardinality enough to not need to be indexed. */
    CREATE INDEX searches_by_membership ON searches (membership_id);
    `,
    callback
  );
};

exports.down = function (db, callback) {
  db.dropTable('searches', callback);
};

exports._meta = {
  version: 1,
};
