import { MessageInitShape } from '@bufbuild/protobuf';
import { keyPath, ListToken } from '@stately-cloud/client';
import { DestinyClass } from 'bungie-api-ts/destiny2';
import _ from 'lodash';
import { CustomStatDef } from '../shapes/custom-stats.js';
import { LoadoutParameters, LoadoutSort } from '../shapes/loadouts.js';
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
  CustomStatDefSchema,
  DescriptionOptions,
  LoadoutParametersSchema,
  InfuseDirection as StatelyInfuseDirection,
  ItemPopupTab as StatelyItemPopupTab,
  LoadoutSort as StatelyLoadoutSort,
  Settings as StatelySettings,
  VaultWeaponGroupingStyle as StatelyVaultWeaponGroupingStyle,
} from './generated/index.js';
import {
  bigIntToNumber,
  enumToStringUnion,
  listToMap,
  stripDefaults,
  stripTypeName,
} from './stately-utils.js';

function keyFor(bungieMembershipId: number) {
  return keyPath`/member-${bungieMembershipId}/settings`;
}

/**
 * Get settings for a particular account.
 */
export async function getSettings(bungieMembershipId: number): Promise<Settings> {
  const results = await client.get('Settings', keyFor(bungieMembershipId));
  return results ? convertToDimSettings(results) : defaultSettings;
}

/**
 * Get new settings for a particular account, if they've changed since the
 * token. Returns a new token.
 */
export async function syncSettings(token: ListToken): Promise<[Settings | undefined, ListToken]> {
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
  return [settings, sync.token!];
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
  let loParametersFixed: LoadoutParameters | undefined;
  if (loParameters) {
    const { assumeArmorMasterwork, statConstraints, ...loParametersDefaulted } = stripTypeName(
      bigIntToNumber(loParameters),
    );
    loParametersFixed = {
      ...stripDefaults(loParametersDefaulted),
      // DIM's AssumArmorMasterwork enum starts at 1
      assumeArmorMasterwork: (assumeArmorMasterwork ?? 0) + 1,
      statConstraints: statConstraints.map((c) => {
        const mostlyConverted = stripTypeName(bigIntToNumber(c));
        return {
          ...stripDefaults(mostlyConverted),
          statHash: mostlyConverted.statHash,
        };
      }),
    };
  }
  const loStatConstraintsByClassMap = listToMap(
    'classType',
    'constraints',
    loStatConstraintsByClass,
  );

  const customStatsFixed: CustomStatDef[] = customStats.map((c) => {
    const { class: klass, weights, ...rest } = stripTypeName(bigIntToNumber(c));
    return {
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
    loStatConstraintsByClass: bigIntToNumber(loStatConstraintsByClassMap),
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
    ...rest
  } = settings;

  const collapsedSectionsList = Object.entries(collapsedSections).map(([key, collapsed]) => ({
    key,
    collapsed,
  }));

  // TODO: In Postgres, because we store settings as JSON, I do a clever thing
  // where I only store the diff vs. the default settings. That's harder to do
  // in StatelyDB because the settings are protobufs.
  let loParametersFixed: MessageInitShape<typeof LoadoutParametersSchema> | undefined;
  if (!_.isEmpty(loParameters)) {
    const { assumeArmorMasterwork, ...loParametersDefaulted } = loParameters;
    loParametersFixed = {
      ...loParametersDefaulted,
      // DIM's AssumArmorMasterwork enum starts at 1
      assumeArmorMasterwork: Number(assumeArmorMasterwork) - 1,
    };
  }

  const loStatConstraintsByClassList = Object.entries(loStatConstraintsByClass).map(
    ([classType, constraints]) => ({
      classType: Number(classType),
      constraints: constraints,
    }),
  );

  const customStatsFixed: MessageInitShape<typeof CustomStatDefSchema>[] = customStats.map((c) => {
    const { class: klass, statHash, weights, ...rest } = c;
    return {
      class: klass as number,
      statHash: Number(statHash),
      weights: Object.entries(weights).map(([statHash, weight]) => ({
        statHash: Number(statHash),
        weight: weight ?? 0,
      })),
      ...rest,
    };
  });

  const customTotalStatsList = Object.entries(customTotalStatsByClass).map(
    ([classType, customStats]) => ({
      classType: Number(classType),
      customStats,
    }),
  );

  return client.create('Settings', {
    ...rest,
    memberId: BigInt(bungieMembershipId),
    wishListSources: wishListSource.split('|'),
    characterOrder: CharacterOrder[`CharacterOrder_${characterOrder}`],
    collapsedSections: collapsedSectionsList,
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
 * Insert or update (upsert) an entire settings tree, totally replacing whatever's there.
 */
export async function replaceSettings(
  bungieMembershipId: number,
  settings: Settings,
): Promise<void> {
  await client.put(convertToStatelyItem(settings, bungieMembershipId));
}

/**
 * Update specific key/value pairs within settings, leaving the rest alone. Creates the settings row if it doesn't exist.
 */
export async function setSetting(
  bungieMembershipId: number,
  settings: Partial<Settings>,
): Promise<void> {
  // TODO: maybe we should accept an in-progress transaction?

  await client.transaction(async (txn) => {
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
  });
}

/**
 * Delete the settings row for a particular user.
 */
export async function deleteSettings(bungieMembershipId: number): Promise<void> {
  return client.del(keyFor(bungieMembershipId));
}
