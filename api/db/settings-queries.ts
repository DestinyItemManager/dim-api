import { ClientBase, QueryResult } from 'pg';
import { Settings } from '../shapes/settings.js';

/**
 * Get settings for a particular account.
 */
export async function getSettings(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<{ settings: Partial<Settings>; deleted: boolean; lastModifiedAt: number } | undefined> {
  const results = await client.query<{
    settings: Settings;
    deleted_at: Date | null;
    last_updated_at: Date;
  }>({
    name: 'get_settings',
    text: 'SELECT settings, deleted_at, last_updated_at FROM settings WHERE membership_id = $1',
    values: [bungieMembershipId],
  });
  return results.rows.length > 0
    ? {
        settings: results.rows[0].settings,
        deleted: Boolean(results.rows[0].deleted_at),
        lastModifiedAt: results.rows[0].last_updated_at.getTime(),
      }
    : undefined;
}

/**
 * Insert or update (upsert) an entire settings tree, totally replacing whatever's there.
 */
export async function replaceSettings(
  client: ClientBase,
  bungieMembershipId: number,
  settings: Partial<Settings>,
): Promise<QueryResult> {
  const result = await client.query({
    name: 'upsert_settings',
    text: `insert into settings (membership_id, settings)
values ($1, $2)
on conflict (membership_id)
do update set settings = $2, deleted_at = null`,
    values: [bungieMembershipId, settings],
  });
  return result;
}

/**
 * Update specific key/value pairs within settings, leaving the rest alone. Creates the settings row if it doesn't exist.
 */
export async function setSetting(
  client: ClientBase,
  bungieMembershipId: number,
  settings: Partial<Settings>,
): Promise<QueryResult> {
  return client.query({
    name: 'set_setting',
    text: `insert into settings (membership_id, settings)
values ($1, $2)
on conflict (membership_id)
do update set settings = (settings.settings || $2), deleted_at = null`,
    // The `||` operator merges two JSONB objects, with the right-hand object's keys taking precedence.
    values: [bungieMembershipId, settings],
  });
}

/**
 * Delete the settings row for a particular user.
 */
export async function deleteSettings(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<QueryResult> {
  return client.query({
    name: 'delete_settings',
    text: `update settings set deleted_at = now(), settings = '{}'::jsonb WHERE membership_id = $1`,
    values: [bungieMembershipId],
  });
}
