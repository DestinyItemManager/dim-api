import { keyPath } from '@stately-cloud/client';
import { client } from './client.js';
import { batches } from './stately-utils.js';

export function keyFor(platformMembershipId: string | bigint, triumphHash: number) {
  return keyPath`/p-${BigInt(platformMembershipId)}/d-2/triumph-${triumphHash}`;
}

/**
 * Get all of the tracked triumphs for a particular platformMembershipId.
 */
export async function getTrackedTriumphsForProfile(
  platformMembershipId: string,
): Promise<number[]> {
  const results: number[] = [];
  const iter = client.beginList(keyPath`/p-${BigInt(platformMembershipId)}/d-2/triumph`);
  for await (const item of iter) {
    if (client.isType(item, 'Triumph')) {
      results.push(item.recordHash);
    }
  }
  return results;
}

/**
 * Add a tracked triumph.
 */
export async function trackTriumph(
  platformMembershipId: string,
  recordHash: number,
): Promise<void> {
  await client.put(
    client.create('Triumph', {
      recordHash,
      profileId: BigInt(platformMembershipId),
      destinyVersion: 2,
    }),
  );
}

export function importTriumphs(platformMembershipId: string, recordHashes: number[]) {
  return recordHashes.map((recordHash) =>
    client.create('Triumph', {
      recordHash,
      profileId: BigInt(platformMembershipId),
      destinyVersion: 2,
    }),
  );
}

/**
 * Remove a tracked triumph.
 */
export async function unTrackTriumph(
  platformMembershipId: string,
  recordHash: number,
): Promise<void> {
  await client.del(keyFor(platformMembershipId, recordHash));
}

/**
 * Delete all item annotations for a user (on all platforms).
 */
export async function deleteAllTrackedTriumphs(platformMembershipId: string): Promise<void> {
  const triumphs = await getTrackedTriumphsForProfile(platformMembershipId);
  if (!triumphs.length) {
    return;
  }
  for (const batch of batches(triumphs)) {
    await client.del(...batch.map((recordHash) => keyFor(platformMembershipId, recordHash)));
  }
}
