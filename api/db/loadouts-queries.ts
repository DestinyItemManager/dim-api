import { ClientBase, QueryResult } from 'pg';
import { metrics } from '../metrics/index.js';
import { DestinyVersion } from '../shapes/general.js';
import { Loadout, LoadoutItem } from '../shapes/loadouts.js';
import { isValidItemId, KeysToSnakeCase } from '../utils.js';

export interface LoadoutRow
  extends KeysToSnakeCase<
    Omit<Loadout, 'equipped' | 'unequipped' | 'createdAt' | 'lastUpdatedAt'>
  > {
  created_at: Date;
  last_updated_at: Date | null;
  items: { equipped: LoadoutItem[]; unequipped: LoadoutItem[] };
}

/**
 * Get all of the loadouts for a particular platform_membership_id and destiny_version.
 */
export async function getLoadoutsForProfile(
  client: ClientBase,
  bungieMembershipId: number,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
): Promise<Loadout[]> {
  const results = await client.query<LoadoutRow>({
    name: 'get_loadouts_for_platform_membership_id',
    text: 'SELECT id, name, notes, class_type, emblem_hash, clear_space, items, parameters, created_at, last_updated_at FROM loadouts WHERE membership_id = $1 and platform_membership_id = $2 and destiny_version = $3',
    values: [bungieMembershipId, platformMembershipId, destinyVersion],
  });
  return results.rows.map(convertLoadout);
}

/**
 * Get ALL of loadouts for a particular user across all platforms.
 */
export async function getAllLoadoutsForUser(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<
  {
    platformMembershipId: string;
    destinyVersion: DestinyVersion;
    loadout: Loadout;
  }[]
> {
  const results = await client.query<
    LoadoutRow & { platform_membership_id: string; destiny_version: DestinyVersion }
  >({
    name: 'get_all_loadouts_for_user',
    text: 'SELECT membership_id, platform_membership_id, destiny_version, id, name, notes, class_type, emblem_hash, clear_space, items, parameters, created_at, last_updated_at FROM loadouts WHERE membership_id = $1',
    values: [bungieMembershipId],
  });
  return results.rows.map((row) => {
    const loadout = convertLoadout(row);
    return {
      platformMembershipId: row.platform_membership_id,
      destinyVersion: row.destiny_version,
      loadout,
    };
  });
}

export function convertLoadout(row: LoadoutRow): Loadout {
  const loadout: Loadout = {
    id: row.id,
    name: row.name,
    classType: row.class_type,
    clearSpace: row.clear_space,
    equipped: row.items.equipped || [],
    unequipped: row.items.unequipped || [],
    createdAt: row.created_at.getTime(),
    lastUpdatedAt: row.last_updated_at?.getTime(),
  };
  if (row.notes) {
    loadout.notes = row.notes;
  }
  if (row.emblem_hash) {
    loadout.emblemHash = row.emblem_hash;
  }
  if (row.parameters) {
    loadout.parameters = row.parameters;
  }
  return loadout;
}

/**
 * Insert or update (upsert) a loadout. Loadouts are totally replaced when updated.
 */
export async function updateLoadout(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  loadout: Loadout,
): Promise<QueryResult> {
  const response = await client.query({
    name: 'upsert_loadout',
    text: `insert into loadouts (id, membership_id, platform_membership_id, destiny_version, name, notes, class_type, emblem_hash, clear_space, items, parameters, created_by, last_updated_by)
values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
on conflict (membership_id, id)
do update set (name, notes, class_type, emblem_hash, clear_space, items, parameters, last_updated_at, last_updated_by) = ($5, $6, $7, $8, $9, $10, $11, current_timestamp, $12)`,
    values: [
      loadout.id,
      bungieMembershipId,
      platformMembershipId,
      destinyVersion,
      loadout.name,
      loadout.notes,
      loadout.classType,
      loadout.emblemHash || null,
      loadout.clearSpace,
      {
        equipped: loadout.equipped.map(cleanItem),
        unequipped: loadout.unequipped.map(cleanItem),
      },
      loadout.parameters,
      appId,
    ],
  });

  if (response.rowCount! < 1) {
    // This should never happen!
    metrics.increment('db.loadouts.noRowUpdated.count', 1);
    throw new Error('loadouts - No row was updated');
  }

  return response;
}

/**
 * Make sure items are stored minimally and extra properties don't sneak in
 */
export function cleanItem(item: LoadoutItem): LoadoutItem {
  const hash = item.hash;
  if (!Number.isFinite(hash)) {
    throw new Error('hash must be a number');
  }

  const result: LoadoutItem = {
    hash,
  };

  if (item.amount && Number.isFinite(item.amount)) {
    result.amount = item.amount;
  }

  if (item.id) {
    if (!isValidItemId(item.id)) {
      throw new Error(`item ID ${item.id} is not in the right format`);
    }
    result.id = item.id;
  }

  if (item.socketOverrides) {
    result.socketOverrides = item.socketOverrides;
  }

  if (item.craftedDate && Number.isFinite(item.craftedDate)) {
    result.craftedDate = item.craftedDate;
  }

  return result;
}

/**
 * Delete a loadout. Loadouts are totally replaced when updated.
 */
export async function deleteLoadout(
  client: ClientBase,
  bungieMembershipId: number,
  loadoutId: string,
): Promise<boolean> {
  const response = await client.query<LoadoutRow>({
    name: 'delete_loadout',
    text: `delete from loadouts where membership_id = $1 and id = $2`,
    values: [bungieMembershipId, loadoutId],
  });

  return response.rowCount! >= 1;
}

/**
 * Delete all loadouts for a user (on all platforms).
 */
export async function deleteAllLoadouts(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<QueryResult> {
  return client.query({
    name: 'delete_all_loadouts',
    text: `delete from loadouts where membership_id = $1`,
    values: [bungieMembershipId],
  });
}
