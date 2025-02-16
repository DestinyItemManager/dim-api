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
} from '@stately-cloud/schema';
import { LoadoutParameters, LoadoutSort, StatConstraint } from './loadouts.js';
import { DestinyClass, HashID, ItemID, MembershipID, uint32 } from './types.js';

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

const Columns = type('columns', uint32, { valid: 'this <= 5 && this >= 2' });

export const CollapsedSection = objectType('CollapsedSection', {
  fields: {
    key: { type: string },
    /** Whether this section is collapsed */
    collapsed: { type: bool },
  },
});

export const StatConstraintsEntry = objectType('StatConstraintsEntry', {
  fields: {
    classType: { type: DestinyClass, required: false },
    constraints: { type: arrayOf(StatConstraint), required: false },
  },
});
export const CustomStatsEntry = objectType('CustomStatsEntry', {
  fields: {
    classType: { type: DestinyClass, required: false },
    customStats: { type: arrayOf(HashID) },
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
    statHash: { type: HashID },
    weight: { type: double, required: false },
  },
});

export const CustomStatDef = objectType('CustomStatDef', {
  fields: {
    /** a unique-per-user fake statHash used to look this stat up */
    statHash: { type: HashID },
    /** a unique-per-class name for this stat */
    label: { type: string },
    /** an abbreviated/crunched form of the stat label, for use in search filters */
    shortLabel: { type: string },
    /** which guardian class this stat should be used for. DestinyClass.Unknown makes a global (all 3 classes) stat */
    class: { type: DestinyClass, required: false },
    /** info about how to calculate the stat total */
    weights: { type: arrayOf(CustomStatWeightsEntry) },
  },
});

export const Settings = itemType('Settings', {
  // Settings are stored per-Bungie-membership, not per-profile or per-destiny-version
  keyPath: '/member-:memberId/settings',
  fields: {
    memberId: { type: MembershipID },

    /** Show item quality percentages */
    itemQuality: { type: bool },
    /** Show new items with an overlay */
    showNewItems: { type: bool },
    /** Sort characters (mostRecent, mostRecentReverse, fixed) */
    characterOrder: { type: CharacterOrder },
    /** Custom sorting properties, in order of application */
    // TODO: Default should be ["primStat", "name"] but we don't support list defaults
    itemSortOrderCustom: { type: arrayOf(string), required: false },
    /** supplements itemSortOrderCustom by allowing each sort to be reversed */
    itemSortReversals: { type: arrayOf(string), required: false },
    /** How many columns to display character buckets */
    charCol: { type: Columns, required: false },
    /** How many columns to display character buckets on Mobile */
    charColMobile: { type: Columns, required: false },
    /** How big in pixels to draw items - start smaller for iPad */
    itemSize: { type: uint32, valid: 'this <= 66', required: false },
    /** Which categories or buckets should be collapsed? */
    // TODO: Some support for maps would be great
    collapsedSections: { type: arrayOf(CollapsedSection), required: false },
    /** Hide triumphs once they're completed */
    completedRecordsHidden: { type: bool },
    /** Hide show triumphs the manifest recommends be redacted */
    redactedRecordsRevealed: { type: bool },
    /** Whether to keep one slot per item type open */
    farmingMakeRoomForItems: { type: bool },
    /** How many spaces to clear when using Farming Mode (make space). */
    inventoryClearSpaces: { type: uint32, required: false, valid: 'this <= 9' },

    /** Hide completed triumphs/collections */
    hideCompletedRecords: { type: bool },

    /** Custom character sort - across all accounts and characters! The values are character IDs. */
    customCharacterSort: { type: arrayOf(string), required: false },

    /** The last direction the infusion fuel finder was set to. */
    infusionDirection: { type: InfuseDirection, required: false },

    /** The user's preferred language code. */
    language: { type: string, required: false },

    /**
     * External sources for wish lists.
     * Expected to be a valid URL.
     * initialState should hold the current location of a reasonably-useful collection of rolls.
     * Set to empty string to not use wishListSource.
     */
    // TODO: default should be ['https://raw.githubusercontent.com/48klocs/dim-wish-list-sources/master/voltron.txt']
    // TODO: this should be "url" but it's a string for now since interpretAs doesn't yet work
    wishListSources: { type: arrayOf(string), required: false },

    /**
     * The last used settings for the Loadout Optimizer. These apply to all classes.
     */
    // TODO: originally this was Exclude<LoadoutParameters, "mods" | "query" | "exoticArmorHash" | "statConstraints" | "clearMods">;
    loParameters: { type: LoadoutParameters, required: false },

    /**
     * Stat order, enablement, etc. Stored per class.
     */
    // TODO: maps, again
    loStatConstraintsByClass: {
      type: arrayOf(StatConstraintsEntry),

      required: false,
    },

    /** list of stat hashes of interest, keyed by class enum */
    customTotalStatsByClass: { type: arrayOf(CustomStatsEntry), required: false },

    /** Selected columns for the Vault Organizer */
    // TODO: Default should be ["icon", "name", "dmg", "power", "locked", "tag", "wishList", "archetype", "perks", "notes"]
    organizerColumnsWeapons: { type: arrayOf(string) },
    // TODO: Default should be ["icon", "name", "power", "dmg", "energy", "locked", "tag", "ghost", "modslot", "perks", "stats", "customstat", "notes"]
    organizerColumnsArmor: { type: arrayOf(string) },
    // TODO: Default should be ["icon", "name", "locked", "tag", "perks", "notes"]
    organizerColumnsGhost: { type: arrayOf(string) },

    /** Compare base stats or actual stats in Compare */
    compareBaseStats: { type: bool },
    /** Item popup sidecar collapsed just shows icon and no character locations */
    sidecarCollapsed: { type: bool },

    /** In "Single Character Mode" DIM pretends you only have one (active) character and all the other characters' items are in the vault. */
    singleCharacter: { type: bool },

    /** Badge the app icon with the number of postmaster items on the current character */
    badgePostmaster: { type: bool },

    /** Display perks as a list instead of a grid. */
    perkList: { type: bool },

    /** How the loadouts menu and page should be sorted */
    loadoutSort: { type: LoadoutSort, required: false },

    /** Hide tagged items in the Item Feed */
    itemFeedHideTagged: { type: bool },

    /** Show the Item Feed */
    itemFeedExpanded: { type: bool },

    /** Pull from postmaster is an irreversible action and some people don't want to accidentally hit it. */
    hidePullFromPostmaster: { type: bool },

    /** Select descriptions to display */
    descriptionsToDisplay: { type: DescriptionOptions, required: false },

    /** Plug the T10 masterwork into D2Y2+ random roll weapons for comparison purposes. */
    compareWeaponMasterwork: { type: bool },

    /**
     * Cutoff point; the instance ID of the newest item that isn't shown in
     * the item feed anymore after the user presses the "clear" button.
     */
    itemFeedWatermark: { type: ItemID, required: false },

    /**
     * a set of user-defined custom stat totals.
     * this will supersede customTotalStatsByClass.
     * it defaults below to empty, which in DIM, initiates fallback to customTotalStatsByClass
     */
    customStats: { type: arrayOf(CustomStatDef), required: false },

    /** Automatically sync lock status with tag */
    autoLockTagged: { type: bool },

    /** The currently chosen theme. */
    theme: { type: string, required: false },

    /** Whether to sort triumphs on the records tab by their progression percentage. */
    sortRecordProgression: { type: bool },

    /** Whether to hide items that cost silver from the Vendors screen. */
    vendorsHideSilverItems: { type: bool },

    /** An additional layer of grouping for weapons in the vault. */
    vaultWeaponGrouping: { type: string, required: false },

    /** How grouped weapons in the vault should be displayed. */
    vaultWeaponGroupingStyle: { type: VaultWeaponGroupingStyle, required: false },

    /** The currently selected item popup tab. */
    itemPopupTab: { type: ItemPopupTab, required: false },
  },
});
