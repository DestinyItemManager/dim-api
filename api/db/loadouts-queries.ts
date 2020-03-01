import { Loadout, LoadoutItem } from '../shapes/loadouts';
import { ClientBase, QueryResult } from 'pg';
import { DestinyVersion } from '../shapes/general';
import { metrics } from '../metrics';

/**
 * Get all of the loadouts for a particular platform_membership_id and destiny_version.
 */
export async function getLoadoutsForProfile(
  client: ClientBase,
  bungieMembershipId: number,
  platformMembershipId: string,
  destinyVersion: DestinyVersion
): Promise<Loadout[]> {
  const results = await client.query<Loadout>({
    name: 'get_loadouts_for_platform_membership_id',
    text:
      'SELECT id, name, class_type, emblem_hash, clear_space, items FROM loadouts WHERE membership_id = $1 and platform_membership_id = $2 and destiny_version = $3',
    values: [bungieMembershipId, platformMembershipId, destinyVersion]
  });
  return results.rows.map(convertLoadout);
}

/**
 * Get ALL of loadouts for a particular user across all platforms.
 */
export async function getAllLoadoutsForUser(
  client: ClientBase,
  bungieMembershipId: number
): Promise<
  {
    platformMembershipId: string;
    destinyVersion: DestinyVersion;
    loadout: Loadout;
  }[]
> {
  const results = await client.query({
    name: 'get_all_loadouts_for_user',
    text:
      'SELECT membership_id, platform_membership_id, destiny_version, id, name, class_type, emblem_hash, clear_space, items FROM loadouts WHERE membership_id = $1',
    values: [bungieMembershipId]
  });
  return results.rows.map((row) => {
    const loadout = convertLoadout(row);
    return {
      platformMembershipId: row.platform_membership_id,
      destinyVersion: row.destiny_version,
      loadout
    };
  });
}

function convertLoadout(row: any): Loadout {
  const loadout: Loadout = {
    id: row.id,
    name: row.name,
    classType: row.class_type,
    clearSpace: row.clear_space,
    equipped: row.items.equipped || [],
    unequipped: row.items.unequipped || []
  };
  if (row.emblem_hash) {
    loadout.emblemHash = row.emblem_hash;
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
  loadout: Loadout
): Promise<QueryResult<any>> {
  const response = await client.query({
    name: 'upsert_loadout',
    text: `insert into loadouts (id, membership_id, platform_membership_id, destiny_version, name, class_type, emblem_hash, clear_space, items, created_by, last_updated_by)
values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
on conflict (membership_id, id)
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
      {
        equipped: loadout.equipped.map(cleanItem),
        unequipped: loadout.unequipped.map(cleanItem)
      },
      appId
    ]
  });

  if (response.rowCount < 1) {
    // This should never happen!
    metrics.increment('db.itemAnnotations.noRowUpdated.count', 1);
    throw new Error('No row was updated');
  }

  return response;
}

/**
 * Make sure items are stored minimally and extra properties don't sneak in
 */
function cleanItem(item: LoadoutItem): LoadoutItem {
  const hash = item.hash;
  if (!Number.isFinite(hash)) {
    throw new Error('hash must be a number');
  }

  const result: LoadoutItem = {
    hash
  };

  if (item.amount && Number.isFinite(item.amount)) {
    result.amount = item.amount;
  }

  if (item.id) {
    if (!/^\d{1,32}$/.test(item.id)) {
      throw new Error(`item ID ${item.id} is not in the right format`);
    }
    result.id = item.id;
  }

  return result;
}

/**
 * Delete a loadout. Loadouts are totally replaced when updated.
 */
export async function deleteLoadout(
  client: ClientBase,
  bungieMembershipId: number,
  loadoutId: string
): Promise<Loadout | null> {
  const response = await client.query({
    name: 'delete_loadout',
    text: `delete from loadouts where membership_id = $1 and id = $2 returning *`,
    values: [bungieMembershipId, loadoutId]
  });

  if (response.rowCount < 1) {
    return null;
  }

  return convertLoadout(response.rows[0]);
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
