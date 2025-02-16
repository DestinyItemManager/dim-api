import { keyPath, StatelyError, WithPutOptions } from '@stately-cloud/client';
import { Loadout } from '../shapes/loadouts.js';
import { delay } from '../utils.js';
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
  try {
    await client.put(loadoutShare, { mustNotExist: true });
  } catch (e) {
    if (e instanceof StatelyError && e.statelyCode === 'ConditionalCheckFailed') {
      throw new LoadoutShareCollision();
    }
  }
}

/**
 * Put loadout shares - this is meant for migrations.
 */
export async function addLoadoutSharesForMigration(
  shares: {
    platformMembershipId: string;
    shareId: string;
    loadout: Loadout;
  }[],
): Promise<void> {
  const statelyShares = shares.map(
    ({ platformMembershipId, shareId, loadout }): WithPutOptions<StatelyLoadoutShare> => ({
      item: convertLoadoutShareToStately(loadout, platformMembershipId, shareId),
      // Preserve the original timestamps
      overwriteMetadataTimestamps: true,
    }),
  );

  // We overwrite here - shares are immutable, so this is fine.
  await client.putBatch(...statelyShares);
}

/**
 * Touch the last_accessed_at and visits fields to keep track of access.
 */
export async function recordAccess(shareId: string): Promise<void> {
  for (let attempts = 0; attempts < 3; attempts++) {
    try {
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
      return;
    } catch (e) {
      if (e instanceof StatelyError && e.statelyCode === 'ConcurrentModification') {
        // try again after a delay
        await delay(100 * Math.random() + 100);
      } else {
        throw e;
      }
    }
  }
}

export async function getLoadoutShareByShareId(shareId: string): Promise<Loadout | undefined> {
  const result = await client.get('LoadoutShare', keyFor(shareId));
  return result ? convertLoadoutFromStately(result) : undefined;
}

// This is here for tests
export async function deleteLoadoutShare(shareId: string): Promise<void> {
  return client.del(keyFor(shareId));
}
