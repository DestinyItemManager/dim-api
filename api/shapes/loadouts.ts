import { DestinyClass } from 'bungie-api-ts/destiny2';

export interface LoadoutItem {
  /** itemInstanceId of the item (if it's instanced) */
  id?: string;
  /** DestinyInventoryItemDefinition hash of the item */
  hash: number;
  /** Optional amount (for consumables), default to zero */
  amount?: number;
  /**
   * The socket overrides for the item. These signal what DestinyInventoryItemDefinition
   * (by it's hash) is supposed to be socketed into the given socket index.
   */
  socketOverrides?: { [socketIndex: number]: number };
  /**
   * UTC epoch seconds timestamp of when the item was crafted. Used to
   * match up items that have changed instance ID from being reshaped since they
   * were added to the loadout.
   */
  craftedDate?: number;
}

export interface Loadout {
  /**
   * A globally unique (UUID) identifier for the loadout.
   * Chosen by the client
   */
  id: string;
  name: string;
  /** Optional longform notes about the loadout. */
  notes?: string;
  /**
   * DestinyClass enum value for the class this loadout is restricted
   * to. This is optional (set to Unknown for loadouts that can be used anywhere).
   */
  classType: DestinyClass;
  /**
   * DestinyInventoryItemDefinition hash of an emblem to use as
   * an icon for this loadout
   */
  emblemHash?: number;
  /** Whether to clear out other items when applying this loadout */
  clearSpace: boolean;
  /** Lists of equipped and unequipped items in the loadout */
  equipped: LoadoutItem[];
  unequipped: LoadoutItem[];
  /** Information about the desired properties of this loadout - used to drive the Loadout Optimizer or apply Mod Loadouts */
  parameters?: LoadoutParameters;
  /** When was this Loadout initially created? Tracked automatically by the API - when saving a loadout this field is ignored. */
  createdAt?: number;
  /** When was this Loadout last changed? Tracked automatically by the API - when saving a loadout this field is ignored. */
  lastUpdatedAt?: number;
  /**
   * Automatically added stat mods. These are separate from the manually chosen
   * mods in parameters.mods, and are saved here to avoid having to figure them
   * out all over again every time (especially since our algorithm might
   * change). Combine this list and parameters.mods when displaying or actually
   * applying the loadout.
   */
  autoStatMods?: number[];
}

/** The level of upgrades the user is willing to perform in order to fit mods into their loadout or hit stats. */
export const enum UpgradeSpendTier {
  Nothing,
  LegendaryShards,
  EnhancementPrisms,
  AscendantShardsNotExotic,
  AscendantShards,
  AscendantShardsNotMasterworked,
  /**
   * @deprecated
   * No longer needed with the lock energy toggle, treat this as if it was the Nothing option.
   */
  AscendantShardsLockEnergyType,
}

/** Whether armor of this type will have assumed masterworked stats in the Loadout Optimizer. */
export const enum AssumeArmorMasterwork {
  /** No armor will have assumed masterworked stats. */
  None = 1,
  /** Only legendary armor will have assumed masterworked stats. */
  Legendary,
  /** All armor (legendary & exotic) will have assumed masterworked stats. */
  All,
}

/**
 * Whether armor of this type will have locked energy type in the Loadout Optimizer.
 * @deprecated
 * Armor energy type does not exist anymore.
 */
export const enum LockArmorEnergyType {
  /** No armor will have their energy type locked. */
  None = 1,
  /** Only already masterworked armor will have their energy type locked. */
  Masterworked,
  /** All armor will have their energy type locked. */
  All,
}

/** How the loadouts menu and page should be sorted */
export const enum LoadoutSort {
  ByEditTime,
  ByName,
}

/**
 * Parameters that explain how this loadout was chosen (in Loadout Optimizer)
 * and at the same time, how this loadout should be configured when equipped.
 * This can be used to re-load a loadout into Loadout Optimizer with its
 * settings intact, or to equip the right mods when applying a loadout if AWA is
 * ever released.
 *
 * All properties are optional, but most have defaults specified in
 * defaultLoadoutParameters that should be used if they are undefined.
 */
export interface LoadoutParameters {
  /**
   * The stats the user cared about for this loadout, in the order they cared about them and
   * with optional range by tier. If a stat is "ignored" it should just be missing from this
   * list.
   */
  statConstraints?: StatConstraint[];

  /**
   * The mods that will be used with this loadout. Each entry is an inventory
   * item hash representing the mod item. Hashes may appear multiple times.
   * These are not associated with any specific item in the loadout - when
   * applying the loadout we should automatically determine the minimum of
   * changes required to match the desired mods, and apply these mods to the
   * equipped items.
   */
  mods?: number[];

  /**
   * If set, after applying the mods above, all other mods will be removed from armor.
   */
  clearMods?: boolean;

  /**
   * Mods that must be applied to a specific bucket hash. In general, prefer to
   * use the flat mods list above, and rely on the loadout function to assign
   * mods automatically. However there are some mods like shaders which can't
   * be automatically assigned to the right piece. These only apply to the equipped
   * item.
   */
  modsByBucket?: {
    [bucketHash: number]: number[];
  };

  /** The artifact unlocks relevant to this build. */
  artifactUnlocks?: {
    /** The item hashes of the unlocked artifact perk items. */
    unlockedItemHashes: number[];
    /** The season this set of artifact unlocks was chosen from. */
    seasonNumber: number;
  };

  /**
   * Whether to automatically add stat mods.
   */
  autoStatMods?: boolean;

  /**
   * A search filter applied while editing the loadout in Loadout Optimizer,
   * which constrains the items that can be in the loadout.
   */
  query?: string;

  /**
   * When generating the loadout, did we assume all items were at their
   * masterworked stats, or did we use their current stats?
   *
   * @deprecated use assumeArmorMasterworked
   */
  assumeMasterworked?: boolean;

  /**
   * What upgrades are the user willing to shell out for?
   *
   * @deprecated use assumeArmorMasterworked
   */
  upgradeSpendTier?: UpgradeSpendTier;

  /**
   * Whether armor of this type will have assumed materwork stats in the Loadout Optimizer.
   */
  assumeArmorMasterwork?: AssumeArmorMasterwork;

  /**
   * The InventoryItemHash of the pinned exotic, if any was chosen.
   */
  exoticArmorHash?: number;

  /**
   * Don't change energy type of armor in order to fit mods.
   *
   * @deprecated use lockArmorEnergyType
   */
  lockItemEnergyType?: boolean;

  /**
   * Whether armor of this type will have locked energy type in the Loadout Optimizer.
   * @deprecated Armor energy type does not exist anymore.
   */
  lockArmorEnergyType?: LockArmorEnergyType;
}

/**
 * All properties of LoadoutParameters are optional, in order to make them
 * compact when shared. Before using LoadoutParameters, merge it with these
 * defaults.
 */
export const defaultLoadoutParameters: LoadoutParameters = {
  statConstraints: [
    { statHash: 2996146975 }, //Mobility
    { statHash: 392767087 }, //Resilience
    { statHash: 1943323491 }, //Recovery
    { statHash: 1735777505 }, //Discipline
    { statHash: 144602215 }, //Intellect
    { statHash: 4244567218 }, //Strength
  ],
  mods: [],
  assumeArmorMasterwork: AssumeArmorMasterwork.None,
  lockArmorEnergyType: LockArmorEnergyType.None,
  autoStatMods: true,
};

/** A constraint on the values an armor stat can take */
export interface StatConstraint {
  /** The stat definition hash of the stat */
  statHash: number;
  /** The minimum tier value for the stat. 0 if unset. */
  minTier?: number;
  /** The maximum tier value for the stat. 10 if unset. */
  maxTier?: number;
}
