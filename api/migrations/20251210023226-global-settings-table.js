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
  // It's a single-row table (for now at least) to hold global settings as a JSON blob.
  db.runSql(
    `CREATE TABLE global_settings (
      flavor text PRIMARY KEY NOT NULL default 'app',
      settings jsonb NOT NULL default '{}'::jsonb
    );

    INSERT INTO global_settings (flavor, settings) VALUES ('app', '{}'::jsonb);
    INSERT INTO global_settings (flavor, settings) VALUES ('dev', '{}'::jsonb);
    INSERT INTO global_settings (flavor, settings) VALUES ('beta', '{}'::jsonb);
    `,
    callback,
  );
};

exports.down = function (db, callback) {
  db.dropTable('global_settings', callback);
};

exports._meta = {
  version: 1,
};
