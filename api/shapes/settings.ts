// Synced with the definitions in DIM/src/app/settings/reducer.ts

import { CustomStatDef } from './custom-stats';
import { LoadoutParameters, LoadoutSort, StatConstraint } from './loadouts';

export type CharacterOrder = 'mostRecent' | 'mostRecentReverse' | 'fixed' | 'custom';

export enum InfuseDirection {
  /** infuse something into the query (query = target) */
  INFUSE,
  /** infuse the query into the target (query = source) */
  FUEL,
}

export interface Settings {
  /** Show item quality percentages */
  readonly itemQuality: boolean;
  /** Show new items with an overlay */
  readonly showNewItems: boolean;
  /** Sort characters (mostRecent, mostRecentReverse, fixed) */
  readonly characterOrder: CharacterOrder;
  /** Custom sorting properties, in order of application */
  readonly itemSortOrderCustom: string[];
  /** supplements itemSortOrderCustom by allowing each sort to be reversed */
  readonly itemSortReversals: string[];
  /** How many columns to display character buckets */
  readonly charCol: number;
  /** How many columns to display character buckets on Mobile */
  readonly charColMobile: number;
  /** How big in pixels to draw items - start smaller for iPad */
  readonly itemSize: number;
  /** Which categories or buckets should be collapsed? */
  readonly collapsedSections: { [key: string]: boolean };
  /** Hide triumphs once they're completed */
  readonly completedRecordsHidden: boolean;
  /** Hide show triumphs the manifest recommends be redacted */
  readonly redactedRecordsRevealed: boolean;
  /** Whether to keep one slot per item type open */
  readonly farmingMakeRoomForItems: boolean;
  /** How many spaces to clear when using Farming Mode(make space). */
  readonly inventoryClearSpaces: number;

  /** Hide completed Destiny 1 records */
  readonly hideCompletedRecords: boolean;

  /** Custom character sort - across all accounts and characters! */
  readonly customCharacterSort: string[];

  /** The last direction the infusion fuel finder was set to. */
  readonly infusionDirection: InfuseDirection;

  /** The user's preferred language. */
  readonly language: string;

  /**
   * External source for wish lists.
   * Expected to be a valid URL.
   * initialState should hold the current location of a reasonably-useful collection of rolls.
   * Set to empty string to not use wishListSource.
   */
  readonly wishListSource: string;

  /**
   * The last used settings for the Loadout Optimizer. These apply to all classes.
   */
  readonly loParameters: Exclude<
    LoadoutParameters,
    'mods' | 'query' | 'exoticArmorHash' | 'statConstraints' | 'clearMods'
  >;

  /**
   * Stat order, enablement, etc. Stored per class.
   */
  readonly loStatConstraintsByClass: {
    [key: number]: StatConstraint[];
  };

  /** list of stat hashes of interest, keyed by class enum */
  readonly customTotalStatsByClass: {
    [key: number]: number[];
  };

  /** Selected columns for the Vault Organizer */
  readonly organizerColumnsWeapons: string[];
  readonly organizerColumnsArmor: string[];
  readonly organizerColumnsGhost: string[];

  /** Compare base stats or actual stats in Compare */
  readonly compareBaseStats: boolean;
  /** Item popup sidecar collapsed just shows icon and no character locations */
  readonly sidecarCollapsed: boolean;

  /** In "Single Character Mode" DIM pretends you only have one (active) character and all the other characters' items are in the vault. */
  readonly singleCharacter: boolean;

  /** Badge the app icon with the number of postmaster items on the current character */
  readonly badgePostmaster: boolean;

  /** Display perks as a list instead of a grid. */
  readonly perkList: boolean;

  /** How the loadouts menu and page should be sorted */
  readonly loadoutSort: LoadoutSort;

  /** Hide tagged items in the Item Feed */
  readonly itemFeedHideTagged: boolean;

  /** Show the Item Feed */
  readonly itemFeedExpanded: boolean;

  /** Pull from postmaster is an irreversible action and some people don't want to accidentally hit it. */
  readonly hidePullFromPostmaster: boolean;

  /** Select descriptions to display */
  readonly descriptionsToDisplay: 'bungie' | 'community' | 'both';

  /** Plug the T10 masterwork into D2Y2+ random roll weapons for comparison purposes. */
  readonly compareWeaponMasterwork: boolean;

  /**
   * Cutoff point; the instance ID of the newest item that isn't shown in
   * the item feed anymore after the user presses the "clear" button.
   */
  readonly itemFeedWatermark: string | undefined;

  /**
   * a set of user-defined custom stat totals.
   * this will supercede customTotalStatsByClass.
   * it defaults below to empty, which in DIM, initiates fallback to customTotalStatsByClass
   */
  readonly customStats: CustomStatDef[];
}

export const defaultSettings: Settings = {
  // Show item quality percentages
  itemQuality: true,
  // Show new items with a red dot
  showNewItems: false,
  // Sort characters (mostRecent, mostRecentReverse, fixed)
  characterOrder: 'mostRecent',
  itemSortOrderCustom: ['primStat', 'name'],
  itemSortReversals: [],
  // How many columns to display character buckets
  charCol: 3,
  // How many columns to display character buckets on Mobile
  charColMobile: 4,
  // How big in pixels to draw items - start smaller for iPad
  itemSize: 50,
  // Which categories or buckets should be collapsed?
  collapsedSections: {},
  // Hide triumphs once they're completed
  completedRecordsHidden: false,
  // Hide show triumphs the manifest recommends be redacted
  redactedRecordsRevealed: false,
  // Whether to keep one slot per item type open
  farmingMakeRoomForItems: true,
  inventoryClearSpaces: 1,
  hideCompletedRecords: false,

  customCharacterSort: [],

  infusionDirection: InfuseDirection.INFUSE,

  language: 'en',

  wishListSource:
    'https://raw.githubusercontent.com/48klocs/dim-wish-list-sources/master/voltron.txt',

  loParameters: {}, // Uses the defaults from defaultLoadoutParameters
  loStatConstraintsByClass: {}, // Uses the defaults from defaultLoadoutParameters

  customTotalStatsByClass: {},
  organizerColumnsWeapons: [
    'icon',
    'name',
    'dmg',
    'power',
    'locked',
    'tag',
    'wishList',
    'archetype',
    'perks',
    'notes',
  ],
  organizerColumnsArmor: [
    'icon',
    'name',
    'power',
    'dmg',
    'energy',
    'locked',
    'tag',
    'ghost',
    'modslot',
    'perks',
    'stats',
    'customstat',
    'notes',
  ],
  organizerColumnsGhost: ['icon', 'name', 'locked', 'tag', 'perks', 'notes'],

  compareBaseStats: false,
  sidecarCollapsed: false,

  singleCharacter: false,
  badgePostmaster: true,
  perkList: true,
  loadoutSort: LoadoutSort.ByEditTime,
  itemFeedHideTagged: true,
  itemFeedExpanded: false,
  hidePullFromPostmaster: false,
  descriptionsToDisplay: 'both',
  compareWeaponMasterwork: false,
  itemFeedWatermark: undefined,
  customStats: [],
};
