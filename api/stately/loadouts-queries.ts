import { MessageInitShape } from '@bufbuild/protobuf';
import { keyPath } from '@stately-cloud/client';
import { DestinyClass } from 'bungie-api-ts/destiny2';
import _ from 'lodash';
import { parse as parseUUID, stringify as stringifyUUID } from 'uuid';
import { DestinyVersion } from '../shapes/general.js';
import { Loadout, LoadoutItem, LoadoutParameters, StatConstraint } from '../shapes/loadouts.js';
import { isValidItemId } from '../utils.js';
import { client } from './client.js';
import {
  LoadoutParametersSchema,
  LoadoutSchema,
  LoadoutShareSchema,
  Loadout as StatelyLoadout,
  LoadoutItem as StatelyLoadoutItem,
  LoadoutParameters as StatelyLoadoutParameters,
  LoadoutShare as StatelyLoadoutShare,
} from './generated/index.js';
import { batches, listToMap, stripDefaults, stripTypeName } from './stately-utils.js';

function keyFor(
  platformMembershipId: string,
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
// TODO: We probably will get these in a big query across all types more often than one type at a time
export async function getLoadoutsForProfile(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
): Promise<Loadout[]> {
  const results: Loadout[] = [];
  const iter = client.beginList(
    keyPath`/p-${BigInt(platformMembershipId)}/d-${destinyVersion}/loadout`,
  );
  for await (const item of iter) {
    if (client.isType(item, 'Loadout')) {
      results.push(convertLoadoutFromStately(item));
    }
  }
  return results;
}

/**
 * Get ALL of loadouts for a particular user across all platforms.
 */
export async function getAllLoadoutsForUser(platformMembershipId: string): Promise<
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
  return (await d1Loadouts)
    .map((a) => ({ platformMembershipId, destinyVersion: 1 as DestinyVersion, loadout: a }))
    .concat(
      (await d2Loadouts).map((a) => ({
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
  const { assumeArmorMasterwork, statConstraints, ...loParametersDefaulted } =
    stripTypeName(loParameters);
  return {
    ...stripDefaults(loParametersDefaulted),
    // DIM's AssumArmorMasterwork enum starts at 1
    assumeArmorMasterwork: (assumeArmorMasterwork ?? 0) + 1,
    statConstraints:
      statConstraints.length > 0
        ? statConstraints.map((c) => {
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
          })
        : undefined,
    autoStatMods: true,
    includeRuntimeStatBenefits: true,
  };
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
  if (!_.isEmpty(item.socketOverrides)) {
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
  return {
    destinyVersion,
    profileId: BigInt(platformMembershipId),
    name: loadout.name,
    classType: loadout.classType as number,
    equipped: (loadout.equipped || []).map(convertLoadoutItemToStately),
    unequipped: (loadout.unequipped || []).map(convertLoadoutItemToStately),
    createdAt: BigInt(loadout.createdAt ?? 0),
    lastUpdatedAt: BigInt(loadout.lastUpdatedAt ?? 0),
    notes: loadout.notes,
    parameters: convertLoadoutParametersToStately(loadout.parameters),
  };
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
  if (!_.isEmpty(loParameters)) {
    const { assumeArmorMasterwork, statConstraints, ...loParametersDefaulted } = loParameters;
    loParametersFixed = {
      ...loParametersDefaulted,
      statConstraints:
        statConstraints && statConstraints.length > 0
          ? statConstraints.map((c) => ({
              statHash: c.statHash,
              minTier: c.minTier ?? 0,
              maxTier: c.maxTier ?? 10,
            }))
          : [],
      // DIM's AssumArmorMasterwork enum starts at 1
      assumeArmorMasterwork: Number(assumeArmorMasterwork) - 1,
    };
  }
  return loParametersFixed;
}

/**
 * Insert or update (upsert) a loadout. Loadouts are totally replaced when updated.
 */
export async function updateLoadout(
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  loadout: Loadout,
): Promise<void> {
  await client.put(convertLoadoutToStately(loadout, platformMembershipId, destinyVersion));
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
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  ...loadoutIds: string[]
): Promise<void> {
  if (loadoutIds.length === 0) {
    return;
  }
  await client.del(...loadoutIds.map((id) => keyFor(platformMembershipId, destinyVersion, id)));
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
