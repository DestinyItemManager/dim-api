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
    `CREATE TABLE loadouts (
      id UUID NOT NULL, /* loadout ID, primary key but not indexed because who cares */
      platform_membership_id bigint NOT NULL,
      destiny_version smallint NOT NULL default 2,
      membership_id int NOT NULL, /* Not especially useful but good to keep track of for emergencies */

      name text NOT NULL,
      notes text,
      class_type smallint NOT NULL default 3,
      /* Items in a loadout are just JSON */
      items jsonb NOT NULL default '{}'::jsonb,
      parameters jsonb,

      created_at timestamp NOT NULL default current_timestamp,
      last_updated_at timestamp NOT NULL default current_timestamp,
      deleted_at timestamp, /* soft delete timestamp */

      /* loadouts are unique by platform_membership_id ID and loadout ID - effectively they're scoped by user */
      PRIMARY KEY(platform_membership_id, id)
    );

    /* This can be reused on other tables as well.
    CREATE FUNCTION sync_lastmod() RETURNS trigger AS $$
    BEGIN
      NEW.last_updated_at := NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER
      loadouts_last_updated
    BEFORE UPDATE ON
      loadouts
    FOR EACH ROW EXECUTE PROCEDURE
      sync_lastmod();
    `,
    callback,
  );
};

exports.down = function (db, callback) {
  db.dropTable('loadouts', callback);
};

exports._meta = {
  version: 1,
};
