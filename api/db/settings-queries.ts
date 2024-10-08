import { ClientBase, QueryResult } from 'pg';
import { Settings } from '../shapes/settings.js';

/**
 * Get settings for a particular account.
 */
export async function getSettings(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<Partial<Settings>> {
  const results = await client.query<{ settings: Settings }>({
    name: 'get_settings',
    text: 'SELECT settings FROM settings WHERE membership_id = $1',
    values: [bungieMembershipId],
  });
  return results.rows.length > 0 ? results.rows[0].settings : {};
}

/**
 * Insert or update (upsert) an entire settings tree, totally replacing whatever's there.
 */
export async function replaceSettings(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  settings: Partial<Settings>,
): Promise<QueryResult> {
  const result = await client.query({
    name: 'upsert_settings',
    text: `insert into settings (membership_id, settings, created_by, last_updated_by)
values ($1, $2, $3, $3)
on conflict (membership_id)
do update set (settings, last_updated_at, last_updated_by) = ($2, current_timestamp, $3)`,
    values: [bungieMembershipId, settings, appId],
  });
  return result;
}

/**
 * Update specific key/value pairs within settings, leaving the rest alone. Creates the settings row if it doesn't exist.
 */
export async function setSetting(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  settings: Partial<Settings>,
): Promise<QueryResult> {
  return client.query({
    name: 'set_setting',
    text: `insert into settings (membership_id, settings, created_by, last_updated_by)
values ($1, $2, $3, $3)
on conflict (membership_id)
do update set (settings, last_updated_at, last_updated_by) = (settings.settings || $2, current_timestamp, $3)`,
    values: [bungieMembershipId, settings, appId],
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
    text: `delete FROM settings WHERE membership_id = $1`,
    values: [bungieMembershipId],
  });
}
