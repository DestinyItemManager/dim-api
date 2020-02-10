import { Loadout } from '../shapes/loadouts';
import { camelize } from '../utils';
import { ClientBase, QueryResult } from 'pg';

/**
 * Get all of the loadouts for a particular platform_membership_id and destiny_version.
 */
export async function getLoadoutsForPlatformMembershipId(
  client: ClientBase,
  platformMembershipId: number,
  destinyVersion: 1 | 2
): Promise<Loadout[]> {
  const results = await client.query<Loadout>({
    name: 'get_loadouts_for_platform_membership_id',
    text:
      'SELECT id, name, class_type, emblem_hash, clear_space, items FROM loadouts WHERE platform_membership_id = $1 and destiny_version = $2',
    values: [platformMembershipId, destinyVersion]
  });
  return results.rows.map((row) => camelize<Loadout>(row));
}

/**
 * Get all of loadouts for a particular user across all platforms.
 */
export async function getAllLoadoutsForUser(
  client: ClientBase,
  bungieMembershipId: number
): Promise<Loadout[]> {
  const results = await client.query<Loadout>({
    name: 'get_all_loadouts_for_user',
    text:
      'SELECT membership_id, platform_membership_id, destiny_version, id, name, class_type, emblem_hash, clear_space, items FROM loadouts WHERE membership_id = $1',
    values: [bungieMembershipId]
  });
  return results.rows.map((row) => camelize<Loadout>(row));
}

/**
 * Insert or update (upsert) a loadout. Loadouts are totally replaced when updated.
 */
export async function updateLoadout(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  platformMembershipId: string,
  destinyVersion: 1 | 2,
  loadout: Loadout
): Promise<QueryResult<any>> {
  return client.query({
    name: 'upsert_loadout',
    text: `insert into loadouts (id, membership_id, platform_membership_id, destiny_version, name, class_type, emblem_hash, clear_space, items, created_by, last_updated_by)
values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
on conflict (id)
do update set (name, class_type, emblem_hash, clear_space, items, last_updated_at, last_updated_by) = ($5, $6, $7, $8, $9, current_timestamp, $10)`,
    values: [
      loadout.id,
      bungieMembershipId,
      platformMembershipId,
      destinyVersion,
      loadout.name,
      loadout.classType,
      loadout.emblemHash || null,
      loadout.clearSpace,
      { equipped: loadout.equipped, unequipped: loadout.unequipped },
      appId
    ]
  });
}

/**
 * Delete a loadout. Loadouts are totally replaced when updated.
 */
export async function deleteLoadout(
  client: ClientBase,
  loadoutId: string
): Promise<QueryResult<any>> {
  return client.query({
    name: 'delete_loadout',
    text: `delete from loadouts where id = $1`,
    values: [loadoutId]
  });
}

/**
 * Delete all loadouts for a user (on all platforms).
 */
export async function deleteAllLoadouts(
  client: ClientBase,
  bungieMembershipId: number
): Promise<QueryResult<any>> {
  return client.query({
    name: 'delete_all_loadouts',
    text: `delete from loadouts where membership_id = $1`,
    values: [bungieMembershipId]
  });
}
