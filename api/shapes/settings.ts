// Synced with the definitions in DIM/src/app/settings/reducer.ts

export type CharacterOrder =
  | 'mostRecent'
  | 'mostRecentReverse'
  | 'fixed'
  | 'custom';

export enum InfuseDirection {
  /** infuse something into the query (query = target) */
  INFUSE,
  /** infuse the query into the target (query = source) */
  FUEL,
}

/** The subset of DestinyActivityModeType that we use for game modes. */
export enum DtrD2ActivityModes {
  notSpecified = 0,
  playerVersusEnemy = 7,
  playerVersusPlayer = 5,
  raid = 4,
  // trials = DestinyActivityModeType.TrialsOfTheNine
  gambit = 63,
}

export enum DtrReviewPlatform {
  All = 0,
  Xbox = 1,
  Playstation = 2,
  AllConsoles = 101,
  Pc = 3,
}

export interface Settings {
  /** Show full details in item popup */
  readonly itemDetails: boolean;
  /** Show item quality percentages */
  readonly itemQuality: boolean;
  /** Show new items with an overlay */
  readonly showNewItems: boolean;
  /** Show item reviews */
  readonly showReviews: boolean;
  /** Can we post identifying information to DTR? */
  readonly allowIdPostToDtr: boolean;
  /** Sort characters (mostRecent, mostRecentReverse, fixed) */
  readonly characterOrder: CharacterOrder;
  /**
   * Sort items in buckets (primaryStat, rarityThenPrimary, quality).
   * This used to let you set a preset but now it's always "custom"
   * unless loaded from an older settings.
   */
  readonly itemSort: string;
  readonly itemSortOrderCustom: string[];
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
  /** Destiny 2 platform selection for ratings + reviews */
  readonly reviewsPlatformSelectionV2: DtrReviewPlatform;
  /** Destiny 2 play mode selection for ratings + reviews - see DestinyActivityModeType for values */
  readonly reviewsModeSelection: DtrD2ActivityModes;

  /** Hide completed Destiny 1 records */
  readonly hideCompletedRecords: boolean;

  /** Custom character sort - across all accounts and characters! */
  readonly customCharacterSort: string[];

  /** The last direction the infusion fuel finder was set to. */
  readonly infusionDirection: InfuseDirection;

  /** Whether the item picker should equip or store. */
  readonly itemPickerEquip: boolean;

  /** The user's preferred language. */
  readonly language: string;

  /** Colorblind modes. */
  readonly colorA11y: string;

  /**
   * External source for wish lists.
   * Expected to be a valid URL.
   * initialState should hold the current location of a reasonably-useful collection of rolls.
   * Set to empty string to not use wishListSource.
   */
  readonly wishListSource: string;

  /** The initial stat order in the loadout opimizer. */
  readonly loStatSortOrder: number[];

  /** The initial status of assume masterwork in the loadout optimizer. */
  readonly loAssumeMasterwork: boolean;

  /** Thie minimum power for an armor set in the loadout optimizer. */
  readonly loMinPower: number;

  /**The minimum stat total for a single armor piece in the loadout optimizer. */
  readonly loMinStatTotal: number;

  /** list of stat hashes of interest, keyed by class enum */
  readonly customTotalStatsByClass: {
    [key: number]: number[];
  };

  /** Selected columns for the Vault Organizer */
  readonly organizerColumnsWeapons: string[];
  readonly organizerColumnsArmor: string[];
  readonly organizerColumnsGhost: string[];

  /** Compare base stats or actual stats in Compare */
  compareBaseStats: boolean;
  /** Item popup sidecar collapsed just shows icon and no character locations */
  sidecarCollapsed: boolean;
}

export const defaultSettings: Settings = {
  // Show full details in item popup
  itemDetails: true,
  // Show item quality percentages
  itemQuality: true,
  // Show new items with a red dot
  showNewItems: false,
  // Show item reviews
  showReviews: true,
  // Can we post identifying information to DTR?
  allowIdPostToDtr: true,
  // Sort characters (mostRecent, mostRecentReverse, fixed)
  characterOrder: 'mostRecent',
  // Sort items in buckets (primaryStat, rarityThenPrimary, quality)
  itemSort: 'custom',
  itemSortOrderCustom: ['primStat', 'name'],
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
  // Destiny 2 platform selection for ratings + reviews
  reviewsPlatformSelectionV2: 0,
  // Destiny 2 play mode selection for ratings + reviews - see DestinyActivityModeType for values
  reviewsModeSelection: DtrD2ActivityModes.notSpecified,
  hideCompletedRecords: false,

  customCharacterSort: [],

  infusionDirection: InfuseDirection.INFUSE,
  itemPickerEquip: true,

  language: 'en',

  colorA11y: '-',
  wishListSource:
    'https://raw.githubusercontent.com/48klocs/dim-wish-list-sources/master/voltron.txt',

  loStatSortOrder: [
    2996146975, //Mobility
    392767087, //Resilience
    1943323491, //Recovery
    1735777505, //Discipline
    144602215, //Intellect
    4244567218, //Strength
  ],
  loAssumeMasterwork: false,
  loMinPower: 750,
  loMinStatTotal: 55,

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
};
