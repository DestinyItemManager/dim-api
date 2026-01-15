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
    text: 'SELECT id, name, notes, class_type, items, parameters, created_at FROM loadout_shares WHERE id = $1',
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
  bungieMembershipId: number | undefined,
  platformMembershipId: string,
  shareId: string,
  loadout: Loadout,
  viewCount = 0,
): Promise<QueryResult> {
  const response = await client.query({
    name: 'add_loadout_share',
    text: `insert into loadout_shares (id, membership_id, platform_membership_id, name, notes, class_type, items, parameters, view_count)
values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    values: [
      shareId,
      bungieMembershipId,
      platformMembershipId,
      loadout.name,
      loadout.notes,
      loadout.classType,
      {
        equipped: loadout.equipped.map(cleanItem),
        unequipped: loadout.unequipped.map(cleanItem),
      },
      loadout.parameters,
      viewCount,
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
 * Touch the last_accessed_at and visits fields to keep track of access. This returns the loadout, if it exists.
 */
export async function recordAccess(
  client: ClientBase,
  shareId: string,
): Promise<Loadout | undefined> {
  const results = await client.query<LoadoutRow>({
    name: 'loadout_share_record_access',
    text: `update loadout_shares set last_accessed_at = current_timestamp, view_count = view_count + 1 where id = $1 returning id, name, notes, class_type, items, parameters, created_at`,
    values: [shareId],
  });

  if (results.rowCount === 1) {
    return convertLoadout(results.rows[0]);
  } else {
    return undefined;
  }
}
