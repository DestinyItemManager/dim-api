import { partition } from 'es-toolkit';
import { ClientBase, QueryResult } from 'pg';
import { metrics } from '../metrics/index.js';
import { DestinyVersion } from '../shapes/general.js';
import { Loadout, LoadoutItem } from '../shapes/loadouts.js';
import { isValidItemId, KeysToSnakeCase } from '../utils.js';

export interface LoadoutRow extends KeysToSnakeCase<
  Omit<Loadout, 'equipped' | 'unequipped' | 'createdAt' | 'lastUpdatedAt'>
> {
  created_at: Date;
  last_updated_at: Date | null;
  deleted_at: Date | null;
  items: { equipped: LoadoutItem[]; unequipped: LoadoutItem[] };
}

/**
 * Get all of the loadouts for a particular platform_membership_id and destiny_version.
 */
export async function getLoadoutsForProfile(
  client: ClientBase,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
): Promise<Loadout[]> {
  const results = await client.query<LoadoutRow>({
    name: 'get_loadouts_for_platform_membership_id',
    text: 'SELECT id, name, notes, class_type, items, parameters, created_at, last_updated_at FROM loadouts WHERE platform_membership_id = $1 and destiny_version = $2 and deleted_at IS NULL',
    values: [platformMembershipId, destinyVersion],
  });
  return results.rows.map(convertLoadout);
}

/**
 * Get all of the loadouts for a particular platform_membership_id and
 * destiny_version that have changed since a given timestamp, including
 * tombstone rows.
 */
export async function syncLoadoutsForProfile(
  client: ClientBase,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  syncTimestamp: number,
): Promise<{ updated: Loadout[]; deletedLoadoutIds: string[] }> {
  const results = await client.query<LoadoutRow>({
    name: 'sync_loadouts_for_platform_membership_id',
    text: 'SELECT id, name, notes, class_type, items, parameters, created_at, last_updated_at, deleted_at FROM loadouts WHERE platform_membership_id = $1 and destiny_version = $2 and last_updated_at > $3',
    values: [platformMembershipId, destinyVersion, new Date(syncTimestamp)],
  });

  const [updatedRows, deletedRows] = partition(results.rows, (row) => row.deleted_at === null);

  return {
    updated: updatedRows.map(convertLoadout),
    deletedLoadoutIds: deletedRows.map((row) => row.id),
  };
}

export function convertLoadout(row: LoadoutRow): Loadout {
  const loadout: Loadout = {
    id: row.id,
    name: row.name,
    classType: row.class_type,
    equipped: row.items.equipped || [],
    unequipped: row.items.unequipped || [],
    createdAt: row.created_at.getTime(),
    lastUpdatedAt: row.last_updated_at?.getTime(),
  };
  if (row.notes) {
    loadout.notes = row.notes;
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
  bungieMembershipId: number | undefined,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  loadout: Loadout,
): Promise<QueryResult> {
  const response = await client.query({
    name: 'upsert_loadout',
    text: `insert into loadouts (id, membership_id, platform_membership_id, destiny_version, name, notes, class_type, items, parameters)
values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
on conflict (platform_membership_id, id)
do update set
  membership_id = $2,
  destiny_version = $4,
  name = $5,
  notes = $6,
  class_type = $7,
  items = $8,
  parameters = $9,
  deleted_at = null,
  created_at = CASE WHEN loadouts.deleted_at IS NOT NULL THEN now() ELSE loadouts.created_at END`,
    values: [
      loadout.id,
      bungieMembershipId ?? null,
      platformMembershipId,
      destinyVersion,
      loadout.name,
      loadout.notes,
      loadout.classType,
      {
        equipped: loadout.equipped.map(cleanItem),
        unequipped: loadout.unequipped.map(cleanItem),
      },
      loadout.parameters,
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
  platformMembershipId: string,
  loadoutId: string,
): Promise<boolean> {
  const response = await client.query<LoadoutRow>({
    name: 'delete_loadout',
    text: `update loadouts set deleted_at = now() where platform_membership_id = $1 and id = $2 and deleted_at is null`,
    values: [platformMembershipId, loadoutId],
  });

  return response.rowCount! >= 1;
}

/**
 * Delete all loadouts for a user (on all platforms).
 */
export async function deleteAllLoadouts(
  client: ClientBase,
  platformMembershipId: string,
): Promise<QueryResult> {
  return client.query({
    name: 'delete_all_loadouts',
    text: `delete from loadouts where platform_membership_id = $1`,
    values: [platformMembershipId],
  });
}

/**
 * Soft-delete all loadouts for a platform (sets deleted_at timestamp for sync support).
 */
export async function softDeleteAllLoadouts(
  client: ClientBase,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
): Promise<QueryResult> {
  return client.query({
    name: 'soft_delete_all_loadouts',
    text: `update loadouts set deleted_at = now() where platform_membership_id = $1 and destiny_version = $2 and deleted_at is null`,
    values: [platformMembershipId, destinyVersion],
  });
}
