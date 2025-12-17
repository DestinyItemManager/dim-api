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
  db.runSql(`ALTER TABLE apps ADD COLUMN origin text NOT NULL;`, () => {
    db.runSql(
      `ALTER TABLE apps ADD COLUMN created_at timestamp NOT NULL default current_timestamp;`,
      callback
    );
  });
};

exports.down = function(db, callback) {
  db.runSql(`ALTER TABLE apps DROP COLUMN created_at;`, () => {
    db.runSql(`ALTER TABLE apps DROP COLUMN origin;`, callback);
  });
};

exports._meta = {
  version: 1
};
