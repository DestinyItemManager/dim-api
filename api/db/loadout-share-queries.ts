import { ClientBase, QueryResult } from 'pg';
import { metrics } from '../metrics/index.js';
import { Loadout } from '../shapes/loadouts.js';
import { cleanItem, convertLoadout, LoadoutRow } from './loadouts-queries.js';

/**
 * Get a specific loadout share by its share ID.
 */
export async function getLoadoutShare(
  client: ClientBase,
  shareId: string,
): Promise<Loadout | undefined> {
  const results = await client.query<LoadoutRow>({
    name: 'get_loadout_share',
    text: 'SELECT id, name, notes, class_type, emblem_hash, clear_space, items, parameters, created_at FROM loadout_shares WHERE id = $1',
    values: [shareId],
  });
  if (results.rowCount === 1) {
    return convertLoadout(results.rows[0]);
  } else {
    return undefined;
  }
}

/**
 * Create a new loadout share. These are intended to be immutable.
 */
export async function addLoadoutShare(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  platformMembershipId: string,
  shareId: string,
  loadout: Loadout,
): Promise<QueryResult> {
  const response = await client.query({
    name: 'add_loadout_share',
    text: `insert into loadout_shares (id, membership_id, platform_membership_id, name, notes, class_type, emblem_hash, clear_space, items, parameters, created_by)
values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    values: [
      shareId,
      bungieMembershipId,
      platformMembershipId,
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
    metrics.increment('db.loadoutShares.noRowUpdated.count', 1);
    throw new Error('loadout share - No row was updated');
  }

  return response;
}

/**
 * Delete a loadout share from Postgres (only really used in migration).
 */
export async function deleteLoadoutShare(client: ClientBase, shareId: string): Promise<void> {
  await client.query<LoadoutRow>({
    name: 'delete_loadout_share',
    text: 'DELETE FROM loadout_shares WHERE id = $1',
    values: [shareId],
  });
}

/**
 * Touch the last_accessed_at and visits fields to keep track of access.
 */
export async function recordAccess(client: ClientBase, shareId: string): Promise<QueryResult> {
  const response = await client.query({
    name: 'loadout_share_record_access',
    text: `update loadout_shares set last_accessed_at = current_timestamp, visits = visits + 1 where id = $1`,
    values: [shareId],
  });

  if (response.rowCount! < 1) {
    // This should never happen!
    metrics.increment('db.loadoutShares.noRowUpdated.count', 1);
    throw new Error('loadout share - No row was updated');
  }

  return response;
}

/**
 * Get a random chunk of loadout shares.
 */
export async function getLoadoutShares(
  client: ClientBase,
  limit: number,
): Promise<
  {
    platformMembershipId: string;
    shareId: string;
    loadout: Loadout;
  }[]
> {
  type LoadoutShareRow = LoadoutRow & { id: string; platform_membership_id: string };
  let results = await client.query<LoadoutShareRow>({
    name: 'get_loadout_shares',
    text: 'SELECT * FROM loadout_shares OFFSET floor(random() * 1000) + 1 LIMIT $1',
    values: [limit],
  });

  if (results.rowCount === 0) {
    // OK take off the random offset
    results = await client.query<LoadoutShareRow>({
      name: 'get_loadout_shares_not_random',
      text: 'SELECT * FROM loadout_shares LIMIT $1',
      values: [limit],
    });
  }

  return results.rows.map((r) => ({
    platformMembershipId: r.platform_membership_id,
    shareId: r.id,
    loadout: convertLoadout(r),
  }));
}
