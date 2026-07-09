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
    `DO $do$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        EXECUTE $cron$SELECT cron.schedule('null-item-annotations-tags', '0 8 * * 1', $$update item_annotations set deleted_at = now() where notes is null and tag is null and deleted_at is null$$)$cron$;

        EXECUTE $cron$SELECT cron.schedule('old-searches', '10 8 * * 1', $$update searches set deleted_at = now() where deleted_at is null and usage_count = 1 and saved = false and last_used < now() - interval '6 month'$$)$cron$;

        EXECUTE $cron$SELECT cron.schedule('unused-loadout-shares', '30 8 * * 1', $$delete from loadout_shares where view_count = 0 and created_at < now() - interval '1 week'$$)$cron$;

        EXECUTE $cron$SELECT cron.schedule('null-item-hash-tags', '0 8 * * 1', $$update item_hash_tags set deleted_at = now() where notes is null and tag is null and deleted_at is null$$)$cron$;
      END IF;
    END
    $do$;
    `,
    callback,
  );
};

exports.down = function (db, callback) {
  db.runSql(
    `DO $do$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        EXECUTE $cron$SELECT cron.unschedule('null-item-annotations-tags')$cron$;

        EXECUTE $cron$SELECT cron.unschedule('old-searches')$cron$;

        EXECUTE $cron$SELECT cron.unschedule('unused-loadout-shares')$cron$;

        EXECUTE $cron$SELECT cron.unschedule('null-item-hash-tags')$cron$;
      END IF;
    END
    $do$;
    `,
    callback,
  );
};

exports._meta = {
  version: 1,
};
