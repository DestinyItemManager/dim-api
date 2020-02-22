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
    `
    CREATE TYPE item_tag AS ENUM ('favorite', 'keep', 'infuse', 'junk', 'archive', 'clear');
    CREATE TABLE item_annotations (
      membership_id int NOT NULL,
      platform_membership_id text NOT NULL,
      destiny_version smallint NOT NULL default 2,
      inventory_item_id text NOT NULL,
      tag item_tag,
      notes text,
      created_at timestamp NOT NULL default current_timestamp,
      created_by text NOT NULL,
      last_updated_at timestamp NOT NULL default current_timestamp,
      last_updated_by text NOT NULL,
      /* tags are unique by membership ID and inventory item ID - effectively they're scoped by user */
      PRIMARY KEY(membership_id, inventory_item_id)
    );

    /* The typical query to get all item annotations specifies both platform_membership_id and destiny_version. destiny_version is low-cardinality enough to not need to be indexed. */
    CREATE INDEX item_annotations_by_platform_membership ON item_annotations (membership_id, platform_membership_id);
    `,
    callback
  );
};

exports.down = function(db, callback) {
  db.dropTable('item_annotations', () => {
    db.runSql('drop type item_tag', callback);
  });
};

exports._meta = {
  version: 1
};
