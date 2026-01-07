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

// TODO: Would it be better to have a separate index that includes last_updated_at? Should we handle uniqueness automatically?
exports.up = function (db, callback) {
  db.runSql(
    `
    CREATE TABLE item_annotations (
      inventory_item_id bigint NOT NULL, /* uint64 inventory item ID from Bungie */
      platform_membership_id bigint NOT NULL,
      destiny_version smallint NOT NULL default 2,
      membership_id int NOT NULL, /* Not especially useful but good to keep track of for emergencies */

      tag smallint, /* nullable tag enum defined in shapes - null means no tag */
      notes text, /* nullable user notes - null means no notes */
      crafted_date timestamp, /* Items get reissued with a new ID when they are recrafted */

      created_at timestamp NOT NULL default current_timestamp,
      last_updated_at timestamp NOT NULL default current_timestamp,
      deleted_at timestamp, /* soft delete timestamp */

      /* tags are unique by platform_membership_id ID and inventory item ID - effectively they're scoped by user. */
      PRIMARY KEY(platform_membership_id, inventory_item_id)
    );

    CREATE TRIGGER
      item_annotations_last_updated
    BEFORE UPDATE ON
      item_annotations
    FOR EACH ROW EXECUTE PROCEDURE
      sync_lastmod();
    `,
    callback,
  );
};

exports.down = function (db, callback) {
  db.dropTable('item_annotations', () => {
    db.runSql('drop type item_tag', callback);
  });
};

exports._meta = {
  version: 1,
};
