import { ClientBase, QueryResult } from 'pg';
import { metrics } from '../metrics';
import { Loadout } from '../shapes/loadouts';
import { cleanItem, convertLoadout } from './loadouts-queries';

/**
 * Get a specific loadout share by its share ID.
 */
export async function getLoadoutShare(
  client: ClientBase,
  shareId: string
): Promise<Loadout | undefined> {
  try {
    const results = await client.query<Loadout>({
      name: 'get_loadout_share',
      text: 'SELECT id, name, notes, class_type, emblem_hash, clear_space, items, parameters, created_at FROM loadout_shares WHERE id = $1',
      values: [shareId],
    });
    if (results.rowCount === 1) {
      return convertLoadout(results.rows[0]);
    } else {
      return undefined;
    }
  } catch (e) {
    throw new Error(e.name + ': ' + e.message);
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
  loadout: Loadout
): Promise<QueryResult<any>> {
  try {
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

    if (response.rowCount < 1) {
      // This should never happen!
      metrics.increment('db.loadoutShares.noRowUpdated.count', 1);
      throw new Error('loadout share - No row was updated');
    }

    return response;
  } catch (e) {
    throw new Error(e.name + ': ' + e.message);
  }
}

/**
 * Touch the last_accessed_at and visits fields to keep track of access.
 */
export async function recordAccess(
  client: ClientBase,
  shareId: string
): Promise<QueryResult<any>> {
  try {
    const response = await client.query({
      name: 'loadout_share_record_access',
      text: `update loadout_shares set last_accessed_at = current_timestamp, visits = visits + 1 where id = $1`,
      values: [shareId],
    });

    if (response.rowCount < 1) {
      // This should never happen!
      metrics.increment('db.loadoutShares.noRowUpdated.count', 1);
      throw new Error('loadout share - No row was updated');
    }

    return response;
  } catch (e) {
    throw new Error(e.name + ': ' + e.message);
  }
}
