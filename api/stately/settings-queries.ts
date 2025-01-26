import { keyPath, ListToken } from '@stately-cloud/client';
import { DestinyClass } from 'bungie-api-ts/destiny2';
import { CustomStatDef } from '../shapes/custom-stats.js';
import { LoadoutSort } from '../shapes/loadouts.js';
import {
  defaultSettings,
  InfuseDirection,
  ItemPopupTab,
  Settings,
  VaultWeaponGroupingStyle,
} from '../shapes/settings.js';
import { client } from './client.js';
import {
  CharacterOrder,
  DescriptionOptions,
  InfuseDirection as StatelyInfuseDirection,
  ItemPopupTab as StatelyItemPopupTab,
  LoadoutSort as StatelyLoadoutSort,
  Settings as StatelySettings,
  VaultWeaponGroupingStyle as StatelyVaultWeaponGroupingStyle,
} from './generated/index.js';
import {
  convertLoadoutParametersFromStately,
  convertLoadoutParametersToStately,
  statConstraintsFromStately,
  statConstraintsToStately,
} from './loadouts-queries.js';
import {
  bigIntToNumber,
  enumToStringUnion,
  listToMap,
  stripTypeName,
  Transaction,
} from './stately-utils.js';

export function keyFor(bungieMembershipId: number) {
  return keyPath`/member-${BigInt(bungieMembershipId)}/settings`;
}

/**
 * Get settings for a particular account.
 */
export async function getSettings(bungieMembershipId: number): Promise<Settings> {
  const results = await client.get('Settings', keyFor(bungieMembershipId));
  return results ? convertToDimSettings(results) : defaultSettings;
}

/**
 * Get settings for a particular account in a syncable way.
 */
export async function querySettings(
  bungieMembershipId: number,
): Promise<{ settings: Settings; token: ListToken }> {
  const iter = client.beginList(keyFor(bungieMembershipId));
  let settingsItem: StatelySettings | undefined;
  for await (const item of iter) {
    if (client.isType(item, 'Settings')) {
      settingsItem = item;
    }
  }
  const token = iter.token!;
  return {
    settings: settingsItem ? convertToDimSettings(settingsItem) : defaultSettings,
    token,
  };
}

/**
 * Get new settings for a particular account, if they've changed since the
 * token. Returns a new token.
 */
export async function syncSettings(
  token: Buffer,
): Promise<{ settings: Settings | undefined; token: ListToken }> {
  const sync = client.syncList(token);
  let settings: Settings | undefined;
  for await (const change of sync) {
    switch (change.type) {
      case 'changed': {
        const item = change.item;
        if (client.isType(item, 'Settings')) {
          settings = convertToDimSettings(item);
        }
        break;
      }
      case 'reset':
      case 'deleted': {
        // Reset the settings
        settings = defaultSettings;
        break;
      }
      case 'updatedOutsideWindow': {
        // This is a weird one, it really shouldn't happen
        break;
      }
    }
  }
  return { settings, token: sync.token! };
}

/**
 * Convert a Stately Settings item to a DIM Settings object.
 */
export function convertToDimSettings(settings: StatelySettings): Settings {
  const {
    wishListSources,
    characterOrder,
    collapsedSections,
    infusionDirection,
    loParameters,
    loStatConstraintsByClass,
    customTotalStatsByClass,
    loadoutSort,
    descriptionsToDisplay,
    itemFeedWatermark,
    customStats,
    vaultWeaponGroupingStyle,
    itemPopupTab,
    ...rest
  } = settings;

  const collapsedSectionsMap = Object.fromEntries(
    collapsedSections.map((s) => [s.key, s.collapsed]),
  );
  const loParametersFixed = loParameters
    ? convertLoadoutParametersFromStately(loParameters)
    : undefined;
  const loStatConstraintsByClassMap = Object.fromEntries(
    loStatConstraintsByClass.map(({ classType, constraints }) => [
      classType,
      statConstraintsFromStately(constraints) ?? [],
    ]),
  );

  const customStatsFixed: CustomStatDef[] = customStats.map((c) => {
    const { class: klass, statHash, weights, ...rest } = stripTypeName(bigIntToNumber(c));
    return {
      statHash: -statHash, // we stored it negated, because it's always negative
      class: klass as number as DestinyClass,
      weights: listToMap('statHash', 'weight', weights),
      ...rest,
    };
  });

  return {
    ...stripTypeName(bigIntToNumber(rest)),
    wishListSource: wishListSources.join('|'),
    characterOrder: enumToStringUnion(CharacterOrder, characterOrder) as Settings['characterOrder'],
    collapsedSections: collapsedSectionsMap,
    infusionDirection:
      infusionDirection === StatelyInfuseDirection.InfuseDirection_Fuel
        ? InfuseDirection.FUEL
        : InfuseDirection.INFUSE,
    loParameters: loParametersFixed ?? defaultSettings.loParameters,
    loStatConstraintsByClass: loStatConstraintsByClassMap,
    customTotalStatsByClass: listToMap(
      'classType',
      'customStats',
      bigIntToNumber(customTotalStatsByClass),
    ),
    loadoutSort:
      loadoutSort === StatelyLoadoutSort.LoadoutSort_ByEditTime
        ? LoadoutSort.ByEditTime
        : LoadoutSort.ByName,
    descriptionsToDisplay: enumToStringUnion(
      DescriptionOptions,
      descriptionsToDisplay,
    ) as Settings['descriptionsToDisplay'],
    itemFeedWatermark: itemFeedWatermark.toString(),
    customStats: customStatsFixed,
    vaultWeaponGroupingStyle:
      vaultWeaponGroupingStyle === StatelyVaultWeaponGroupingStyle.VaultWeaponGroupingStyle_Inline
        ? VaultWeaponGroupingStyle.Inline
        : VaultWeaponGroupingStyle.Lines,
    itemPopupTab:
      itemPopupTab === StatelyItemPopupTab.ItemPopupTab_Overview
        ? ItemPopupTab.Overview
        : ItemPopupTab.Triage,
  };
}

/**
 * Convert a DIM Settings object to a Stately Settings item.
 */
export function convertToStatelyItem(
  settings: Settings,
  bungieMembershipId: number,
): StatelySettings {
  const {
    wishListSource,
    characterOrder,
    collapsedSections,
    infusionDirection,
    loParameters,
    loStatConstraintsByClass,
    customTotalStatsByClass,
    loadoutSort,
    descriptionsToDisplay,
    itemFeedWatermark,
    customStats,
    vaultWeaponGroupingStyle,
    itemPopupTab,
    itemSize,
    charCol,
    ...rest
  } = settings;

  const collapsedSectionsList = Object.entries(collapsedSections).map(([key, collapsed]) => ({
    key,
    collapsed,
  }));

  // TODO: In Postgres, because we store settings as JSON, I do a clever thing
  // where I only store the diff vs. the default settings. That's harder to do
  // in StatelyDB because the settings are protobufs.
  const loParametersFixed = convertLoadoutParametersToStately(loParameters);

  const loStatConstraintsByClassList = Object.entries(loStatConstraintsByClass).map(
    ([classType, constraints]) => ({
      classType: Number(classType),
      constraints: statConstraintsToStately(constraints),
    }),
  );

  const customStatsFixed = customStats.map((c) => {
    const { class: klass, statHash, weights, ...rest } = c;
    if (statHash >= 0 || !Number.isInteger(statHash)) {
      throw new Error(`Expected fake custom stat hash to be negative integer, was ${statHash}`);
    }
    return client.create('CustomStatDef', {
      class: klass as number,
      statHash: -statHash,
      weights: Object.entries(weights).map(([statHash, weight]) => ({
        statHash: Number(statHash),
        weight: weight ?? 0,
      })),
      ...rest,
    });
  });

  const customTotalStatsList = Object.entries(customTotalStatsByClass)
    .map(([classType, customStats]) => ({
      classType: Number(classType),
      customStats,
    }))
    .filter((c) => c.customStats.length > 0);

  return client.create('Settings', {
    ...rest,
    memberId: BigInt(bungieMembershipId),
    wishListSources: wishListSource.split('|'),
    characterOrder: CharacterOrder[`CharacterOrder_${characterOrder}`],
    collapsedSections: collapsedSectionsList,
    itemSize: Math.min(Math.max(0, itemSize), 66),
    charCol: Math.min(Math.max(2, charCol), 5),
    infusionDirection:
      infusionDirection === InfuseDirection.FUEL
        ? StatelyInfuseDirection.InfuseDirection_Fuel
        : StatelyInfuseDirection.InfuseDirection_Infuse,
    loParameters: loParametersFixed,
    loStatConstraintsByClass: loStatConstraintsByClassList,
    customTotalStatsByClass: customTotalStatsList,
    loadoutSort:
      loadoutSort === LoadoutSort.ByEditTime
        ? StatelyLoadoutSort.LoadoutSort_ByEditTime
        : StatelyLoadoutSort.LoadoutSort_ByName,
    descriptionsToDisplay: DescriptionOptions[`DescriptionOptions_${descriptionsToDisplay}`],
    itemFeedWatermark: BigInt(itemFeedWatermark || '0'),
    customStats: customStatsFixed,
    vaultWeaponGroupingStyle:
      vaultWeaponGroupingStyle === VaultWeaponGroupingStyle.Inline
        ? StatelyVaultWeaponGroupingStyle.VaultWeaponGroupingStyle_Inline
        : StatelyVaultWeaponGroupingStyle.VaultWeaponGroupingStyle_Lines,
    itemPopupTab:
      itemPopupTab === ItemPopupTab.Overview
        ? StatelyItemPopupTab.ItemPopupTab_Overview
        : StatelyItemPopupTab.ItemPopupTab_Triage,
  });
}

/**
 * Update specific key/value pairs within settings, leaving the rest alone. Creates the settings row if it doesn't exist.
 */
export async function setSetting(
  txn: Transaction,
  bungieMembershipId: number,
  settings: Partial<Settings>,
): Promise<void> {
  const storedSettings = await txn.get('Settings', keyFor(bungieMembershipId));
  await txn.put(
    convertToStatelyItem(
      // Merge in the partial settings
      {
        ...(storedSettings ? convertToDimSettings(storedSettings) : defaultSettings),
        ...settings,
      },
      bungieMembershipId,
    ),
  );
}

/**
 * Delete the settings row for a particular user.
 */
export async function deleteSettings(bungieMembershipId: number): Promise<void> {
  return client.del(keyFor(bungieMembershipId));
}
