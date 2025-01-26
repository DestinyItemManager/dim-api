import { keyPath, ListToken } from '@stately-cloud/client';
import { partition } from 'es-toolkit';
import { client } from './client.js';
import { batches, parseKeyPath, Transaction } from './stately-utils.js';

export function keyFor(platformMembershipId: string | bigint, triumphHash: number) {
  return keyPath`/p-${BigInt(platformMembershipId)}/d-2/triumph-${triumphHash}`;
}

/**
 * Get all of the tracked triumphs for a particular platformMembershipId.
 */
export async function getTrackedTriumphsForProfile(
  platformMembershipId: string,
): Promise<{ triumphs: number[]; token: ListToken; deletedTriumphs?: number[] }> {
  const results: number[] = [];
  const iter = client.beginList(keyPath`/p-${BigInt(platformMembershipId)}/d-2/triumph`);
  for await (const item of iter) {
    if (client.isType(item, 'Triumph')) {
      results.push(item.recordHash);
    }
  }
  return { triumphs: results, token: iter.token! };
}

export async function syncTrackedTriumphs(
  tokenData: Buffer,
): Promise<{ triumphs: number[]; token: ListToken; deletedTriumphs?: number[] }> {
  const results: number[] = [];
  const deletedTriumphs: number[] = [];
  const iter = client.syncList(tokenData);
  for await (const change of iter) {
    switch (change.type) {
      case 'reset': {
        throw new Error('token reset');
      }
      case 'changed': {
        const item = change.item;
        if (client.isType(item, 'Triumph')) {
          results.push(item.recordHash);
        }
        break;
      }
      case 'deleted': {
        const keyPath = parseKeyPath(change.keyPath);
        const triumphHash = Number(keyPath.at(-1)!.id);
        deletedTriumphs.push(triumphHash);
        break;
      }
    }
  }
  return { triumphs: results, token: iter.token!, deletedTriumphs };
}

export async function trackUntrackTriumphs(
  txn: Transaction,
  platformMembershipId: string,
  triumphs: {
    recordHash: number;
    tracked: boolean;
  }[],
): Promise<void> {
  const [trackedTriumphs, untrackedTriumphs] = partition(triumphs, (t) => t.tracked);
  if (untrackedTriumphs.length) {
    await txn.del(
      ...untrackedTriumphs.map(({ recordHash }) => keyFor(platformMembershipId, recordHash)),
    );
  }
  if (trackedTriumphs.length) {
    await txn.putBatch(
      ...trackedTriumphs.map(({ recordHash }) =>
        client.create('Triumph', {
          recordHash,
          profileId: BigInt(platformMembershipId),
          destinyVersion: 2,
        }),
      ),
    );
  }
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
 * Delete all item annotations for a user (on all platforms).
 */
export async function deleteAllTrackedTriumphs(platformMembershipId: string): Promise<void> {
  const triumphs = (await getTrackedTriumphsForProfile(platformMembershipId)).triumphs;
  if (!triumphs.length) {
    return;
  }
  for (const batch of batches(triumphs)) {
    await client.del(...batch.map((recordHash) => keyFor(platformMembershipId, recordHash)));
  }
}
