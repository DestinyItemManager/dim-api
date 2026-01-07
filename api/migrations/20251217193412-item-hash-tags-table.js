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
    CREATE TABLE item_hash_tags (
      item_hash bigint NOT NULL,
      platform_membership_id bigint NOT NULL,
      membership_id int NOT NULL, /* Not especially useful but good to keep track of for emergencies */

      tag smallint, /* nullable tag enum defined in shapes - null means no tag */
      notes text, /* nullable user notes - null means no notes */

      created_at timestamp NOT NULL default current_timestamp,
      last_updated_at timestamp NOT NULL default current_timestamp,
      deleted_at timestamp, /* soft delete timestamp */

      /* tags are unique by platform_membership_id ID and item hash - effectively they're scoped by user. */
      PRIMARY KEY(platform_membership_id, item_hash)
    );

    CREATE TRIGGER
      item_hash_tags_last_updated
    BEFORE UPDATE ON
      item_hash_tags
    FOR EACH ROW EXECUTE PROCEDURE
      sync_lastmod();
    `,
    callback,
  );
};

exports.down = function (db, callback) {
  db.dropTable('item_hash_tags', callback);
};

exports._meta = {
  version: 1,
};
