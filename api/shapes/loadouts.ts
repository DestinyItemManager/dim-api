import { DestinyClass } from 'bungie-api-ts/destiny2';

export interface LoadoutItem {
  // itemInstanceId of the item (if it's instanced)
  id?: string;
  // DestinyInventoryItemDefinition hash of the item
  hash: number;
  // Optional amount (for consumables), default to zero
  amount?: number;
}

export interface Loadout {
  // A globally unique (UUID) identifier for the loadout.
  // Chosen by the client
  id: string;
  name: string;
  // DestinyClass enum value for the class this loadout is restricted
  // to. This is optional (set to Unknown for loadouts that can be used anywhere).
  classType: DestinyClass;
  // DestinyInventoryItemDefinition hash of an emblem to use as
  // an icon for this loadout
  emblemHash?: number;
  // Whether to clear out other items when applying this loadout
  clearSpace: boolean;
  // Lists of equipped and unequipped items in the loadout
  equipped: LoadoutItem[];
  unequipped: LoadoutItem[];
  /** Information about the desired properties of this loadout - used to drive the Loadout Optimizer or apply Mod Loadouts */
  parameters?: LoadoutParameters;
}

/**
 * Parameters that explain how this loadout was chosen (in Loadout Optimizer) and at the
 * same time, how this loadout should be configured when equipped. This can be used to
 * re-load a loadout into Loadout Optimizer with its settings intact, or to equip the right
 * mods when applying a loadout if AWA is ever released.
 */
export interface LoadoutParameters {
  /**
   * The stats the user cared about for this loadout, in the order they cared about them and
   * with optional range by tier. If a stat is "ignored" it should just be missing from this
   * list.
   */
  statConstraints?: StatConstraint[];
  /**
   * The mods that will be used with this loadout. Each entry is an inventory item hash representing
   * the mod item. Hashes may appear multiple times. These are not associated with any specific
   * item in the loadout - when applying the loadout we should automatically determine the minimum
   * of changes required to match the desired mods.
   */
  mods?: number[];
  /**
   * A search filter applied while editing the loadout in Loadout Optimizer, which constrains the
   * items that can be in the loadout.
   */
  query?: string[];

  /**
   * When generating the loadout, did we assume all items were at their masterworked stats, or did
   * we use their current stats?
   */
  assumeMasterworked?: boolean;
}

/** A constraint on the values an armor stat can take */
export interface StatConstraint {
  /** The stat definition hash of the stat */
  statHash?: number;
  /** The minimum tier value for the stat. 0 if unset. */
  minTier?: number;
  /** The maximum tier value for the stat. 10 if unset. */
  maxTier?: number;
}
