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
        EXECUTE $cron$SELECT cron.schedule('purge-deleted-settings', '0 9 * * *', $$delete from settings where deleted_at is not null and deleted_at < now() - interval '30 days'$$)$cron$;

        EXECUTE $cron$SELECT cron.schedule('purge-deleted-item-annotations', '5 9 * * *', $$delete from item_annotations where deleted_at is not null and deleted_at < now() - interval '30 days'$$)$cron$;

        EXECUTE $cron$SELECT cron.schedule('purge-deleted-item-hash-tags', '10 9 * * *', $$delete from item_hash_tags where deleted_at is not null and deleted_at < now() - interval '30 days'$$)$cron$;

        EXECUTE $cron$SELECT cron.schedule('purge-deleted-searches', '15 9 * * *', $$delete from searches where deleted_at is not null and deleted_at < now() - interval '30 days'$$)$cron$;

        EXECUTE $cron$SELECT cron.schedule('purge-deleted-loadouts', '20 9 * * *', $$delete from loadouts where deleted_at is not null and deleted_at < now() - interval '30 days'$$)$cron$;

        EXECUTE $cron$SELECT cron.schedule('purge-deleted-tracked-triumphs', '25 9 * * *', $$delete from tracked_triumphs where deleted_at is not null and deleted_at < now() - interval '30 days'$$)$cron$;
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
        EXECUTE $cron$SELECT cron.unschedule('purge-deleted-settings')$cron$;

        EXECUTE $cron$SELECT cron.unschedule('purge-deleted-item-annotations')$cron$;

        EXECUTE $cron$SELECT cron.unschedule('purge-deleted-item-hash-tags')$cron$;

        EXECUTE $cron$SELECT cron.unschedule('purge-deleted-searches')$cron$;

        EXECUTE $cron$SELECT cron.unschedule('purge-deleted-loadouts')$cron$;

        EXECUTE $cron$SELECT cron.unschedule('purge-deleted-tracked-triumphs')$cron$;
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
