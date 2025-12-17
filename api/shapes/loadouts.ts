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

/** normally found inside DestinyLoadoutComponent, mapped to respective definition tables */
export interface InGameLoadoutIdentifiers {
  colorHash: number;
  iconHash: number;
  nameHash: number;
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
  /** List of equipped items in the loadout */
  equipped: LoadoutItem[];
  /** List of unequipped items in the loadout */
  unequipped: LoadoutItem[];
  /** Information about the desired properties of this loadout - used to drive the Loadout Optimizer or apply Mod Loadouts */
  parameters?: LoadoutParameters;
  /** When was this Loadout initially created? Tracked automatically by the API - when saving a loadout this field is ignored. */
  createdAt?: number;
  /** When was this Loadout last changed? Tracked automatically by the API - when saving a loadout this field is ignored. */
  lastUpdatedAt?: number;
}

/** Whether armor of this type will have assumed masterworked stats in the Loadout Optimizer. */
export const enum AssumeArmorMasterwork {
  /** No armor will have assumed masterworked stats. */
  None = 1,
  /** Only legendary armor will have assumed masterworked stats. */
  Legendary,
  /** All armor (legendary & exotic) will have assumed masterworked stats. */
  All,
  /** All armor (legendary & exotic) will have assumed masterworked stats, and Exotic Armor will be upgraded to have an artifice mod slot. */
  ArtificeExotic,
}

/** How the loadouts menu and page should be sorted */
export const enum LoadoutSort {
  ByEditTime,
  ByName,
}

/**
 * A mapping from a DestinyEquipableItemSetDefinition hash to the number of
 * pieces we require that provide that setBonus. The intention is that the count
 * is always exactly enough to activate some number of perks in that set (so
 * far, 2 or 4 pieces).
 */
export interface SetBonusCounts {
  [setBonusHash: number]: number | undefined;
}

/**
 * Parameters that explain how this loadout was chosen (in Loadout Optimizer)
 * and at the same time, how this loadout should be configured when equipped.
 * This can be used to re-load a loadout into Loadout Optimizer with its
 * settings intact, or to equip the right mods when applying a loadout if AWA is
 * ever released.
 *
 * Originally this was meant to model parameters independent of specific items,
 * as a means of sharing Loadout Optimizer settings between users, but now we
 * just share whole loadouts, so this can be used for any sort of parameter we
 * want to add to loadouts.
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
   * equipped items. For shaders/ornaments, use modsByBucket instead.
   */
  mods?: number[];

  /**
   * A list of armor perks that should be included in this loadout. This
   * expresses a desire in the Loadout Optimizer to generate sets that have
   * these perks.
   *
   *  For regular perks each occurrence of the perk in this list represents one
   * instance of the perk that should appear on an item in the loadout. For
   * armor set bonuses, use setBonuses instead.
   *
   * For example, this can be used to:
   * - Specify what exotic class item perks you want
   * - Specify that you want some seasonal armor perks to be used (e.g. 3
   *   instances of Iron Lord's Pride)
   *
   *  For picking specific perks on weapons, use modsByBucket instead.
   */
  perks?: number[];

  /**
   * The set bonuses that we want to activate with this loadout. This is a
   * mapping of one or more DestinyEquipableItemSetDefinition hashes to the
   * number of pieces we require that provide that setBonus.
   */
  setBonuses?: SetBonusCounts;

  /**
   * If set, after applying the mods above, all other mods will be removed from armor.
   */
  clearMods?: boolean;

  /** Whether to clear out other weapons when applying this loadout */
  clearWeapons?: boolean;

  /** Whether to clear out other weapons when applying this loadout */
  clearArmor?: boolean;

  /**
   * Mods or perks that must be applied to a specific bucket hash. In general,
   * prefer to use the flat mods list above, and rely on the loadout function to
   * assign mods automatically. However there are some mods like shaders which
   * can't be automatically assigned to the right piece. These only apply to the
   * equipped item.
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
   * Whether armor of this type will have assumed materwork stats in the Loadout Optimizer.
   */
  assumeArmorMasterwork?: AssumeArmorMasterwork;

  /**
   * The InventoryItemHash of the pinned exotic, if any was chosen.
   */
  exoticArmorHash?: number;

  /**
   * a user may optionally specify which icon/color/name will be used,
   * if this DIM loadout is saved to an in-game slot
   */
  inGameIdentifiers?: InGameLoadoutIdentifiers;

  /**
   * When calculating loadout stats, should "Font of ..." mods be assumed active
   * and their runtime bonus stats be included?
   */
  includeRuntimeStatBenefits?: boolean;
}

/**
 * All properties of LoadoutParameters are optional, in order to make them
 * compact when shared. Before using LoadoutParameters, merge it with these
 * defaults.
 */
export const defaultLoadoutParameters: LoadoutParameters = {
  statConstraints: [
    { statHash: 2996146975 }, // Mobility
    { statHash: 392767087 }, // Resilience
    { statHash: 1943323491 }, // Recovery
    { statHash: 1735777505 }, // Discipline
    { statHash: 144602215 }, // Intellect
    { statHash: 4244567218 }, // Strength
  ],
  mods: [],
  perks: [],
  assumeArmorMasterwork: AssumeArmorMasterwork.None,
  autoStatMods: true,
  includeRuntimeStatBenefits: true,
  clearArmor: false,
  clearMods: false,
  clearWeapons: false,
};

/** A constraint on the values an armor stat can take */
export interface StatConstraint {
  /** The stat definition hash of the stat */
  statHash: number;
  /**
   * The minimum tier value for the stat. 0 if unset.
   * @deprecated in favor of minStat
   */
  minTier?: number;
  /**
   * The maximum tier value for the stat. 10 if unset.
   * @deprecated in favor of maxStat
   */
  maxTier?: number;
  /**
   * Minimum absolute value for the stat. 0 if unset. Replaces minTier in Edge
   * of Fate.
   */
  minStat?: number;
  /**
   * Maximum absolute value for the stat. Max Possible Stat Value if unset.
   * Replaces maxTier in Edge of Fate.
   */
  maxStat?: number;
}
