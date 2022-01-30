/** Compatible superset of Little Light wishlist format */

import { DestinyItemSubType } from 'bungie-api-ts/destiny2';

interface WishList {
  /** Indicates that this JSON file is in the format described by this file. */
  format: 'DIMv1';
  name: string;
  description: string;
  /** URLs of other wish lists that are transitively included into this wishlist. */
  includes: string[];
  /** UNIX timestamp (milliseconds) representing when this wish list was created. */
  date?: number;
  /**
   * Per-item-hash rolls - each one specifies one or more rolls that are
   * specific to a particular DestinyInventoryItem.
   * E.g. "These are the god rolls for The Messenger"
   */
  itemRolls: ItemRoll[];
  /**
   * Perk rolls match specific plug combinations, but without specifying an item.
   * E.g. "Outlaw + Kill Clip is always good"
   */
  perkRolls: Roll[];
  /**
   * Rolls that apply to any weapons in a specific category.
   * E.g. "Shotguns with Shot Package + Slideshot are always good".
   *
   * If you specify the intrinsic perk hash, you can also specify things like
   * "Adaptive Frame Scout Rifles with Surplus + Demolitionist are good"
   */
  categoryRolls: CategoryRoll[];
}

/** These tags are meant to match the Little Light JSON wishlist tags. */
type Tag =
  /** This roll is intended for use in PVE */
  | 'PVE'
  /** This roll is intended for use in PVP */
  | 'PVP'
  /** This roll is specifically good for mouse+keyboard users */
  | 'Mouse'
  /** This roll is specifically good for controller users */
  | 'Controller'
  /** God Roll - "don't you dare throw this away" - not all guns need to have one of these! */
  | 'Godroll'
  /**
   * Good Roll - "this is worth keeping/trying" - for guns you would tell
   * someone to seek out/grind for. if your review of X gun is "you should go
   * get Y gun instead", then X gun doesn't need a Good Roll
   */
  | 'Good'
  /**
   * Perk Recommendation - "if you want this gun, here are the perks you should
   * use" - if you're a wishlist maker, you should write some of these for each
   * gun
   */
  | 'Recommended'
  /**
   * Trash - this sucks, these perks clash - controversial. makes people very
   * sad when they see it, but like the roll
   */
  | 'Trash'
  // Users are free to specify any other tag
  | string;

// TODO: should we try to reduce the size of this?
interface Roll {
  name?: string; // Not used in DIM
  description?: string; // e.g. notes
  plugs: number[][];
  // Can be used to filter which rolls to show!
  tags?: Tag[];
  /**
   * UNIX timestamp (milliseconds) representing when this roll was created or
   * updated. If not specified, uses the date from the wishlist it's in.
   */
  date?: number;
}

interface ItemRoll extends Roll {
  /** Inventory item hash */
  hash: number;
}

interface CategoryRoll extends Roll {
  categories: DestinyItemSubType[];
  /** Optional intrinsic perk hash, used to narrow this to a specific archetype. */
  intrinsic?: number;
}
