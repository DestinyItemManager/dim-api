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

/**
 * The session table stores server-side sessions for the admin panel.
 * This is used by connect-pg-simple to store express-session data.
 */
exports.up = function (db, callback) {
  db.runSql(
    `CREATE TABLE "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
    )`,
    function (err) {
      if (err) return callback(err);
      db.addIndex('session', 'IDX_session_expire', ['expire'], callback);
    },
  );
};

exports.down = function (db, callback) {
  db.dropTable('session', callback);
};

exports._meta = {
  version: 1,
};
