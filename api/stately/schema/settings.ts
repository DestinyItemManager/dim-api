// Synced with the definitions in DIM/src/app/settings/reducer.ts

import {
  arrayOf,
  bool,
  double,
  enumType,
  itemType,
  objectType,
  string,
  type,
  uint,
} from '@stately-cloud/schema';
import { LoadoutParameters, LoadoutSort, StatConstraint } from './loadouts.js';
import { DestinyClass, HashID, ItemID, MembershipID } from './types.js';

export const CharacterOrder = enumType('CharacterOrder', {
  mostRecent: 1,
  mostRecentReverse: 2,
  fixed: 3,
  custom: 4,
});

export const InfuseDirection = enumType('InfuseDirection', {
  /** infuse something into the query (query = target) */
  Infuse: 1,
  /** infuse the query into the target (query = source) */
  Fuel: 2,
});

export const ItemPopupTab = enumType('ItemPopupTab', {
  Overview: 0,
  Triage: 1,
});

export const VaultWeaponGroupingStyle = enumType('VaultWeaponGroupingStyle', {
  Lines: 0,
  Inline: 1,
});

const Columns = type('columns', uint, { valid: 'this <= 5 && this >= 2' });

export const CollapsedSection = objectType('CollapsedSection', {
  fields: {
    key: { type: string, fieldNum: 1 },
    /** Whether this section is collapsed */
    collapsed: { type: bool, fieldNum: 2 },
  },
});

export const StatConstraintsEntry = objectType('StatConstraintsEntry', {
  fields: {
    classType: { type: DestinyClass, fieldNum: 1 },
    constraints: { type: arrayOf(StatConstraint), fieldNum: 2 },
  },
});
export const CustomStatsEntry = objectType('CustomStatsEntry', {
  fields: {
    classType: { type: DestinyClass, fieldNum: 1 },
    customStats: { type: arrayOf(HashID), fieldNum: 2 },
  },
});

export const DescriptionOptions = enumType('DescriptionOptions', {
  bungie: 1,
  community: 2,
  both: 3,
});

// we go generous here on key options, because sometimes a statHash
// is a string, because it was a dictionary key
/** traditional custom stats use a binary 1 or 0 for all 6 armor stats, but this could support more complex weights */
export const CustomStatWeightsEntry = objectType('CustomStatWeightsEntry', {
  fields: {
    statHash: { type: HashID, fieldNum: 1 },
    weight: { type: double, fieldNum: 2 },
  },
});

export const CustomStatDef = objectType('CustomStatDef', {
  fields: {
    /** a unique-per-user fake statHash used to look this stat up */
    statHash: { type: HashID, fieldNum: 1 },
    /** a unique-per-class name for this stat */
    label: { type: string, fieldNum: 2 },
    /** an abbreviated/crunched form of the stat label, for use in search filters */
    shortLabel: { type: string, fieldNum: 3 },
    /** which guardian class this stat should be used for. DestinyClass.Unknown makes a global (all 3 classes) stat */
    class: { type: DestinyClass, fieldNum: 4 },
    /** info about how to calculate the stat total */
    weights: { type: arrayOf(CustomStatWeightsEntry), fieldNum: 5 },
  },
});

export const Settings = itemType('Settings', {
  // Settings are stored per-Bungie-membership, not per-profile or per-destiny-version
  keyPath: '/member-:memberId/settings',
  fields: {
    memberId: { type: MembershipID, fieldNum: 1 },

    /** Show item quality percentages */
    itemQuality: { type: bool, fieldNum: 2 },
    /** Show new items with an overlay */
    showNewItems: { type: bool, fieldNum: 3 },
    /** Sort characters (mostRecent, mostRecentReverse, fixed) */
    characterOrder: { type: CharacterOrder, fieldNum: 4 },
    /** Custom sorting properties, in order of application */
    // TODO: Default should be ["primStat", "name"] but we don't support list defaults
    itemSortOrderCustom: { type: arrayOf(string), fieldNum: 5 },
    /** supplements itemSortOrderCustom by allowing each sort to be reversed */
    itemSortReversals: { type: arrayOf(string), fieldNum: 6, required: false },
    /** How many columns to display character buckets */
    charCol: { type: Columns, fieldNum: 7, required: false },
    /** How many columns to display character buckets on Mobile */
    charColMobile: { type: Columns, fieldNum: 8, required: false },
    /** How big in pixels to draw items - start smaller for iPad */
    itemSize: { type: uint, fieldNum: 9, valid: 'this <= 66', required: false },
    /** Which categories or buckets should be collapsed? */
    // TODO: Some support for maps would be great
    collapsedSections: { type: arrayOf(CollapsedSection), fieldNum: 10, required: false },
    /** Hide triumphs once they're completed */
    completedRecordsHidden: { type: bool, fieldNum: 11 },
    /** Hide show triumphs the manifest recommends be redacted */
    redactedRecordsRevealed: { type: bool, fieldNum: 12 },
    /** Whether to keep one slot per item type open */
    farmingMakeRoomForItems: { type: bool, fieldNum: 13 },
    /** How many spaces to clear when using Farming Mode (make space). */
    inventoryClearSpaces: { type: uint, fieldNum: 14, required: false, valid: 'this <= 9' },

    /** Hide completed triumphs/collections */
    hideCompletedRecords: { type: bool, fieldNum: 15 },

    /** Custom character sort - across all accounts and characters! The values are character IDs. */
    customCharacterSort: { type: arrayOf(string), fieldNum: 16, required: false },

    /** The last direction the infusion fuel finder was set to. */
    infusionDirection: { type: InfuseDirection, fieldNum: 17, required: false },

    /** The user's preferred language code. */
    language: { type: string, fieldNum: 18, required: false },

    /**
     * External sources for wish lists.
     * Expected to be a valid URL.
     * initialState should hold the current location of a reasonably-useful collection of rolls.
     * Set to empty string to not use wishListSource.
     */
    // TODO: default should be ['https://raw.githubusercontent.com/48klocs/dim-wish-list-sources/master/voltron.txt']
    // TODO: this should be "url" but it's a string for now since interpretAs doesn't yet work
    wishListSources: { type: arrayOf(string), fieldNum: 19, required: false },

    /**
     * The last used settings for the Loadout Optimizer. These apply to all classes.
     */
    // TODO: originally this was Exclude<LoadoutParameters, "mods" | "query" | "exoticArmorHash" | "statConstraints" | "clearMods">;
    loParameters: { type: LoadoutParameters, fieldNum: 20, required: false },

    /**
     * Stat order, enablement, etc. Stored per class.
     */
    // TODO: maps, again
    loStatConstraintsByClass: {
      type: arrayOf(StatConstraintsEntry),
      fieldNum: 21,
      required: false,
    },

    /** list of stat hashes of interest, keyed by class enum */
    customTotalStatsByClass: { type: arrayOf(CustomStatsEntry), fieldNum: 22, required: false },

    /** Selected columns for the Vault Organizer */
    // TODO: Default should be ["icon", "name", "dmg", "power", "locked", "tag", "wishList", "archetype", "perks", "notes"]
    organizerColumnsWeapons: { type: arrayOf(string), fieldNum: 23 },
    // TODO: Default should be ["icon", "name", "power", "dmg", "energy", "locked", "tag", "ghost", "modslot", "perks", "stats", "customstat", "notes"]
    organizerColumnsArmor: { type: arrayOf(string), fieldNum: 24 },
    // TODO: Default should be ["icon", "name", "locked", "tag", "perks", "notes"]
    organizerColumnsGhost: { type: arrayOf(string), fieldNum: 25 },

    /** Compare base stats or actual stats in Compare */
    compareBaseStats: { type: bool, fieldNum: 26 },
    /** Item popup sidecar collapsed just shows icon and no character locations */
    sidecarCollapsed: { type: bool, fieldNum: 27 },

    /** In "Single Character Mode" DIM pretends you only have one (active) character and all the other characters' items are in the vault. */
    singleCharacter: { type: bool, fieldNum: 28 },

    /** Badge the app icon with the number of postmaster items on the current character */
    badgePostmaster: { type: bool, fieldNum: 29 },

    /** Display perks as a list instead of a grid. */
    perkList: { type: bool, fieldNum: 30 },

    /** How the loadouts menu and page should be sorted */
    loadoutSort: { type: LoadoutSort, fieldNum: 31, required: false },

    /** Hide tagged items in the Item Feed */
    itemFeedHideTagged: { type: bool, fieldNum: 32 },

    /** Show the Item Feed */
    itemFeedExpanded: { type: bool, fieldNum: 33 },

    /** Pull from postmaster is an irreversible action and some people don't want to accidentally hit it. */
    hidePullFromPostmaster: { type: bool, fieldNum: 34 },

    /** Select descriptions to display */
    descriptionsToDisplay: { type: DescriptionOptions, fieldNum: 35, required: false },

    /** Plug the T10 masterwork into D2Y2+ random roll weapons for comparison purposes. */
    compareWeaponMasterwork: { type: bool, fieldNum: 36 },

    /**
     * Cutoff point; the instance ID of the newest item that isn't shown in
     * the item feed anymore after the user presses the "clear" button.
     */
    itemFeedWatermark: { type: ItemID, fieldNum: 37, required: false },

    /**
     * a set of user-defined custom stat totals.
     * this will supersede customTotalStatsByClass.
     * it defaults below to empty, which in DIM, initiates fallback to customTotalStatsByClass
     */
    customStats: { type: arrayOf(CustomStatDef), fieldNum: 38, required: false },

    /** Automatically sync lock status with tag */
    autoLockTagged: { type: bool, fieldNum: 39 },

    /** The currently chosen theme. */
    theme: { type: string, fieldNum: 40, required: false },

    /** Whether to sort triumphs on the records tab by their progression percentage. */
    sortRecordProgression: { type: bool, fieldNum: 41 },

    /** Whether to hide items that cost silver from the Vendors screen. */
    vendorsHideSilverItems: { type: bool, fieldNum: 42 },

    /** An additional layer of grouping for weapons in the vault. */
    vaultWeaponGrouping: { type: string, fieldNum: 43, required: false },

    /** How grouped weapons in the vault should be displayed. */
    vaultWeaponGroupingStyle: { type: VaultWeaponGroupingStyle, fieldNum: 44, required: false },

    /** The currently selected item popup tab. */
    itemPopupTab: { type: ItemPopupTab, fieldNum: 45, required: false },
  },
});
