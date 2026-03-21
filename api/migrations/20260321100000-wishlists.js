'use strict';

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db, callback) {
  db.runSql(
    `CREATE TABLE wishlists (
      id UUID NOT NULL,
      membership_id int NOT NULL,

      name text NOT NULL,
      description text,
      is_public boolean NOT NULL default false,

      created_at timestamp NOT NULL default current_timestamp,
      last_updated_at timestamp NOT NULL default current_timestamp,

      PRIMARY KEY(membership_id, id)
    );

    CREATE TRIGGER
      wishlists_last_updated
    BEFORE UPDATE ON
      wishlists
    FOR EACH ROW EXECUTE PROCEDURE
      sync_lastmod();

    CREATE TABLE wishlist_rolls (
      id UUID NOT NULL,
      wishlist_id UUID NOT NULL,
      membership_id int NOT NULL,

      item_hash bigint NOT NULL,
      /* Store as JSONB to support the complex [[1,2],[3]] structure */
      recommended_perks jsonb NOT NULL,
      is_expert_mode boolean NOT NULL default false,
      is_undesirable boolean NOT NULL default false,
      notes text,

      created_at timestamp NOT NULL default current_timestamp,
      last_updated_at timestamp NOT NULL default current_timestamp,

      PRIMARY KEY(membership_id, id),
      FOREIGN KEY (membership_id, wishlist_id) REFERENCES wishlists (membership_id, id) ON DELETE CASCADE
    );

    CREATE TRIGGER
      wishlist_rolls_last_updated
    BEFORE UPDATE ON
      wishlist_rolls
    FOR EACH ROW EXECUTE PROCEDURE
      sync_lastmod();
    `,
    callback,
  );
};

exports.down = function (db, callback) {
  db.dropTable('wishlist_rolls', (err) => {
    if (err) return callback(err);
    db.dropTable('wishlists', callback);
  });
};

exports._meta = {
  version: 1,
};
