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

// I'll probably regret this name, but it's basically item_annotations keyed by item hash instead of instance ID. For shaders.
// Hash-based tags D2-only and aren't specific to one profile - if you like a shader, you like it everywhere.
exports.up = function (db, callback) {
  db.runSql(
    `
    CREATE TABLE item_hash_tags (
      membership_id int NOT NULL,
      item_hash bigint NOT NULL,
      tag item_tag,
      notes text,
      created_at timestamp NOT NULL default current_timestamp,
      created_by text NOT NULL,
      last_updated_at timestamp NOT NULL default current_timestamp,
      last_updated_by text NOT NULL,
      /* tags are unique by membership ID and item hash - effectively they're scoped by user */
      PRIMARY KEY(membership_id, item_hash)
    );

    CREATE INDEX item_hash_tags_by_membership ON item_hash_tags (membership_id);
    `,
    callback
  );
};

exports.down = function (db, callback) {
  db.removeIndex('item_hash_tags_by_membership', () => {
    db.dropTable('item_hash_tags', callback);
  });
};

exports._meta = {
  version: 1,
};
