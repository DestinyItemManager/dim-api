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
    `CREATE TRIGGER
      settings_last_updated
    BEFORE UPDATE ON
      settings
    FOR EACH ROW EXECUTE PROCEDURE
      sync_lastmod();

    CREATE TRIGGER
      searches_last_updated
    BEFORE UPDATE ON
      searches
    FOR EACH ROW EXECUTE PROCEDURE
      sync_lastmod();
    `,
    callback,
  );
};

exports.down = function (db, callback) {
  db.runSql(
    `DROP TRIGGER IF EXISTS settings_last_updated ON settings;

    DROP TRIGGER IF EXISTS searches_last_updated ON searches;
    `,
    callback,
  );
};

exports._meta = {
  version: 1,
};
