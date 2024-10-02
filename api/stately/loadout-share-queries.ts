import { keyPath } from '@stately-cloud/client';
import { Loadout } from '../shapes/loadouts.js';
import { client } from './client.js';
import { LoadoutShare as StatelyLoadoutShare } from './generated/index.js';
import {
  convertLoadoutCommonFieldsToStately,
  convertLoadoutFromStately,
} from './loadouts-queries.js';

function keyFor(shareId: string) {
  return keyPath`/loadoutShare-${shareId}`;
}

/**
 * Get a specific loadout share by its share ID.
 */
export async function getLoadoutShare(shareId: string): Promise<Loadout | undefined> {
  const result = await client.get('LoadoutShare', keyFor(shareId));
  return result ? convertLoadoutFromStately(result) : undefined;
}

function convertLoadoutShareToStately(
  loadout: Loadout,
  platformMembershipId: string,
  shareId: string,
): StatelyLoadoutShare {
  return client.create('LoadoutShare', {
    ...convertLoadoutCommonFieldsToStately(loadout, platformMembershipId, 2),
    id: shareId,
  });
}

export class LoadoutShareCollision extends Error {
  static name = 'LoadoutShareCollision';
  constructor() {
    super('Loadout share already exists');
  }
}

/**
 * Create a new loadout share. These are intended to be immutable. Loadout
 * Shares are only supported for D2.
 */
export async function addLoadoutShare(
  platformMembershipId: string,
  shareId: string,
  loadout: Loadout,
): Promise<void> {
  const loadoutShare = convertLoadoutShareToStately(loadout, platformMembershipId, shareId);

  await client.transaction(async (txn) => {
    const existing = await txn.get('LoadoutShare', keyFor(shareId));
    // We do not want to overwrite an existing share! This is another place
    // where a Put-If-Not-Exists would be nice.
    if (existing) {
      throw new LoadoutShareCollision();
    }
    await txn.put(loadoutShare);
  });
}

/**
 * Touch the last_accessed_at and visits fields to keep track of access.
 */
export async function recordAccess(shareId: string): Promise<void> {
  // Hmm this is probably pretty expensive. Should I store the view count in a
  // separate item? It'd also be nice to have an Update API.
  await client.transaction(async (txn) => {
    const loadoutShare = await txn.get('LoadoutShare', keyFor(shareId));
    if (!loadoutShare) {
      throw new Error("somehow this loadout share doesn't exist");
    }

    loadoutShare.viewCount++;

    await txn.put(loadoutShare);
  });
}

export async function getLoadoutShareByShareId(shareId: string): Promise<Loadout | undefined> {
  const result = await client.get('LoadoutShare', keyFor(shareId));
  return result ? convertLoadoutFromStately(result) : undefined;
}

// This is here for tests
export async function deleteLoadoutShare(shareId: string): Promise<void> {
  return client.del(keyFor(shareId));
}
