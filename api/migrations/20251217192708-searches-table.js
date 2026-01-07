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
    `
    CREATE TABLE searches (
      platform_membership_id bigint NOT NULL,
      destiny_version smallint NOT NULL default 2,
      membership_id int NOT NULL, /* Not especially useful but good to keep track of for emergencies */

      query text NOT NULL,
      qhash bytea GENERATED ALWAYS AS (decode(md5(query), 'hex')) STORED,
      saved boolean NOT NULL default false,
      usage_count int NOT NULL default 1,
      last_used timestamp NOT NULL default current_timestamp,
      search_type smallint NOT NULL DEFAULT 1,

      created_at timestamp NOT NULL default current_timestamp,
      last_updated_at timestamp NOT NULL default current_timestamp,
      deleted_at timestamp, /* soft delete timestamp */

      PRIMARY KEY(platform_membership_id, qhash, destiny_version)
    );
    `,
    callback,
  );
};

exports.down = function (db, callback) {
  db.dropTable('searches', callback);
};

exports._meta = {
  version: 1,
};
