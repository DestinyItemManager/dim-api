import { MessageInitShape } from '@bufbuild/protobuf';
import { keyPath, ListToken } from '@stately-cloud/client';
import { DestinyClass } from 'bungie-api-ts/destiny2';
import { isEmpty } from 'es-toolkit/compat';
import { DestinyVersion } from '../shapes/general.js';
import {
  AssumeArmorMasterwork,
  Loadout,
  LoadoutItem,
  LoadoutParameters,
  StatConstraint,
} from '../shapes/loadouts.js';
import { isValidItemId } from '../utils.js';
import { getProfile } from './bulk-queries.js';
import { client } from './client.js';
import {
  LoadoutParametersSchema,
  LoadoutSchema,
  LoadoutShareSchema,
  Loadout as StatelyLoadout,
  LoadoutItem as StatelyLoadoutItem,
  LoadoutParameters as StatelyLoadoutParameters,
  LoadoutShare as StatelyLoadoutShare,
  StatConstraint as StatelyStatConstraint,
} from './generated/index.js';
import {
  batches,
  listToMap,
  parseUUID,
  stringifyUUID,
  stripDefaults,
  stripTypeName,
  Transaction,
} from './stately-utils.js';

export function keyFor(
  platformMembershipId: string | bigint,
  destinyVersion: DestinyVersion,
  loadoutId: Uint8Array | string,
) {
  if (typeof loadoutId === 'string') {
    loadoutId = parseUUID(loadoutId);
  }
  return keyPath`/p-${BigInt(platformMembershipId)}/d-${destinyVersion}/loadout-${loadoutId}`;
}

/**
 * Get all of the loadouts for a particular platform_membership_id and destiny_version.
 */
export async function getLoadoutsForProfile(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
): Promise<{ loadouts: Loadout[]; token: ListToken }> {
  const { profile, token } = await getProfile(platformMembershipId, destinyVersion, '/loadout');
  return { loadouts: profile.loadouts ?? [], token };
}

/**
 * Get ALL of loadouts for a particular user across all platforms.
 */
async function getAllLoadoutsForUser(platformMembershipId: string): Promise<
  {
    platformMembershipId: string;
    destinyVersion: DestinyVersion;
    loadout: Loadout;
  }[]
> {
  // Rather than list ALL items under the profile and filter down to loadouts,
  // just separately get the D1 and D2 tags. We probably won't use this - for
  // export we *will* scrape a whole profile.
  const d1Loadouts = getLoadoutsForProfile(platformMembershipId, 1);
  const d2Loadouts = getLoadoutsForProfile(platformMembershipId, 2);
  return (await d1Loadouts).loadouts
    .map((a) => ({ platformMembershipId, destinyVersion: 1 as DestinyVersion, loadout: a }))
    .concat(
      (await d2Loadouts).loadouts.map((a) => ({
        platformMembershipId,
        destinyVersion: 2 as DestinyVersion,
        loadout: a,
      })),
    );
}

export function convertLoadoutFromStately(item: StatelyLoadout | StatelyLoadoutShare): Loadout {
  const loadout: Loadout = {
    // TODO: it's a bit weird to use the share ID for loadout shares. We should probably just mint a new UUID.
    id: typeof item.id === 'string' ? item.id : stringifyUUID(item.id),
    name: item.name,
    classType: item.classType as number as DestinyClass,
    equipped: (item.equipped || []).map(convertLoadoutItemFromStately),
    unequipped: (item.unequipped || []).map(convertLoadoutItemFromStately),
    createdAt: Number(item.createdAt),
    lastUpdatedAt: Number(item.lastUpdatedAt),
  };
  if (item.notes) {
    loadout.notes = item.notes;
  }
  if (item.parameters) {
    loadout.parameters = convertLoadoutParametersFromStately(item.parameters);
  }
  return loadout;
}

export function convertLoadoutParametersFromStately(
  loParameters: StatelyLoadoutParameters,
): LoadoutParameters {
  const {
    assumeArmorMasterwork,
    statConstraints,
    modsByBucket,
    artifactUnlocks,
    inGameIdentifiers,
    ...loParametersDefaulted
  } = stripTypeName(loParameters);
  return {
    ...stripDefaults(loParametersDefaulted),
    exoticArmorHash: exoticArmorHashFromStately(loParameters.exoticArmorHash),
    // DIM's AssumArmorMasterwork enum starts at 1
    assumeArmorMasterwork: (assumeArmorMasterwork ?? 0) + 1,
    statConstraints: statConstraintsFromStately(statConstraints),
    modsByBucket: isEmpty(modsByBucket)
      ? undefined
      : listToMap('bucketHash', 'modHashes', modsByBucket),
    artifactUnlocks: artifactUnlocks ? stripTypeName(artifactUnlocks) : undefined,
    inGameIdentifiers: inGameIdentifiers ? stripTypeName(inGameIdentifiers) : undefined,
  };
}

function exoticArmorHashFromStately(hash: bigint) {
  if (hash === 0n) {
    return undefined;
  }
  // Some hashes got sign-flipped when I was changing data types from uint32 to
  // int32 to int64 - the signed versions interpreted larger numbers (> 2^31) as
  // signed, and everything got messed up. -1 and -2 are still valid special
  // cases.
  if (hash < -2) {
    hash = 4294967296n + hash; // The constant is 32 set bits, plus one
  }
  return Number(hash);
}

export function statConstraintsFromStately(statConstraints: StatelyStatConstraint[]) {
  if (statConstraints.length === 0) {
    return undefined;
  }
  const constraints = statConstraints.map((c) => {
    const constraint: StatConstraint = {
      statHash: c.statHash,
    };
    if (c.minTier !== 0) {
      constraint.minTier = c.minTier;
    }
    // This is the tricky one - an undefined value means max tier 10
    if (c.maxTier !== 10) {
      constraint.maxTier = c.maxTier;
    }
    return constraint;
  });

  // I screwed up the max constraints for some stored items, so we'll fix them here
  if (constraints.every((c) => c.maxTier === 0)) {
    for (const c of constraints) {
      delete c.maxTier;
    }
  }
  return constraints;
}

function convertLoadoutItemFromStately(item: StatelyLoadoutItem): LoadoutItem {
  const result: LoadoutItem = {
    hash: item.hash,
  };
  if (item.amount) {
    result.amount = item.amount;
  }
  if (item.id) {
    result.id = item.id.toString();
  }
  if (!isEmpty(item.socketOverrides)) {
    result.socketOverrides = listToMap('socketIndex', 'itemHash', item.socketOverrides);
  }
  if (item.craftedDate) {
    result.craftedDate = Number(item.craftedDate);
  }
  return result;
}

export function convertLoadoutToStately(
  loadout: Loadout,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
): StatelyLoadout {
  return client.create('Loadout', {
    ...convertLoadoutCommonFieldsToStately(loadout, platformMembershipId, destinyVersion),
    id: parseUUID(loadout.id),
  });
}

export function convertLoadoutCommonFieldsToStately(
  loadout: Loadout,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
): Omit<
  MessageInitShape<typeof LoadoutSchema> | MessageInitShape<typeof LoadoutShareSchema>,
  'id' | '$typeName'
> {
  const out = {
    destinyVersion,
    profileId: BigInt(platformMembershipId),
    name: loadout.name || 'Unnamed',
    classType: loadout.classType as number,
    equipped: (loadout.equipped || []).map(convertLoadoutItemToStately),
    unequipped: (loadout.unequipped || []).map(convertLoadoutItemToStately),
    notes: loadout.notes,
    parameters: convertLoadoutParametersToStately(loadout.parameters),
    createdAt: BigInt(loadout.createdAt ? new Date(loadout.createdAt).getTime() : 0n),
    lastUpdatedAt: BigInt(loadout.lastUpdatedAt ? new Date(loadout.lastUpdatedAt).getTime() : 0n),
  };
  if (out.lastUpdatedAt < out.createdAt) {
    out.lastUpdatedAt = out.createdAt;
  }
  return out;
}

function convertLoadoutItemToStately(item: LoadoutItem): StatelyLoadoutItem {
  item = cleanItem(item);

  return client.create('LoadoutItem', {
    hash: item.hash,
    amount: item.amount,
    id: item.id ? BigInt(item.id) : undefined,
    socketOverrides: item.socketOverrides
      ? Object.entries(item.socketOverrides).map(([socketIndex, itemHash]) => ({
          socketIndex: Number(socketIndex),
          itemHash: Number(itemHash),
        }))
      : undefined,
    craftedDate: item.craftedDate ? BigInt(item.craftedDate) : undefined,
  });
}

export function convertLoadoutParametersToStately(
  loParameters: LoadoutParameters | undefined,
): MessageInitShape<typeof LoadoutParametersSchema> | undefined {
  let loParametersFixed: MessageInitShape<typeof LoadoutParametersSchema> | undefined;
  if (!isEmpty(loParameters)) {
    const {
      assumeArmorMasterwork,
      exoticArmorHash,
      statConstraints,
      modsByBucket,
      ...loParametersDefaulted
    } = loParameters;
    loParametersFixed = {
      ...loParametersDefaulted,
      exoticArmorHash: BigInt(exoticArmorHash ?? 0),
      statConstraints: statConstraintsToStately(statConstraints),
      // DIM's AssumArmorMasterwork enum starts at 1
      assumeArmorMasterwork: Number(assumeArmorMasterwork ?? AssumeArmorMasterwork.None) - 1,
      modsByBucket: modsByBucket
        ? Object.entries(modsByBucket).map(([bucketHash, modHashes]) => ({
            bucketHash: Number(bucketHash),
            modHashes: modHashes.filter((h) => Number.isInteger(h)),
          }))
        : undefined,
    };
  }
  return loParametersFixed;
}

export function statConstraintsToStately(statConstraints: StatConstraint[] | undefined) {
  return statConstraints && statConstraints.length > 0
    ? statConstraints.map((c) => ({
        statHash: c.statHash,
        minTier: Math.max(0, Math.floor(c.minTier ?? 0)),
        maxTier: Math.min(Math.ceil(c.maxTier ?? 10), 10),
      }))
    : [];
}

/**
 * Insert or update (upsert) loadouts. Loadouts are totally replaced when updated.
 */
export async function updateLoadout(
  txn: Transaction,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  loadouts: Loadout[],
): Promise<void> {
  const items = loadouts.map((loadout) =>
    convertLoadoutToStately(loadout, platformMembershipId, destinyVersion),
  );
  await txn.putBatch(...items);
}

export function importLoadouts(
  loadouts: (Loadout & {
    platformMembershipId: string;
    destinyVersion: DestinyVersion;
  })[],
) {
  return loadouts
    .filter((v) => v.platformMembershipId && v.destinyVersion)
    .map((v) => convertLoadoutToStately(v, v.platformMembershipId, v.destinyVersion));
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
 * Delete one or more loadouts.
 */
export async function deleteLoadout(
  txn: Transaction,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  loadoutIds: string[],
): Promise<void> {
  if (loadoutIds.length === 0) {
    return;
  }
  await txn.del(...loadoutIds.map((id) => keyFor(platformMembershipId, destinyVersion, id)));
}

/**
 * Delete all loadouts for a user (on all platforms).
 */
export async function deleteAllLoadouts(platformMembershipId: string): Promise<void> {
  // TODO: this is inefficient, for delete-my-data we'll nuke all the items in the group at once
  const allLoadouts = await getAllLoadoutsForUser(platformMembershipId);
  if (!allLoadouts.length) {
    return;
  }

  for (const batch of batches(allLoadouts)) {
    await client.del(
      ...batch.map((a) => keyFor(a.platformMembershipId, a.destinyVersion, a.loadout.id)),
    );
  }
}
