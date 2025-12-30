/** 
 * Compatible superset of Little Light wishlist format for DIM.
 *
 * Note: This describes a future, theoretical wish list format that IS NOT IMPLEMENTED in DIM today.
 */

import { DestinyItemSubType } from 'bungie-api-ts/destiny2';

export type ItemHash = number;
export type StatHash = number;

export interface WishList {
  /**
   * Indicates that this JSON file is in the format described by this schema. If
   * the format is changed in a non-backwards-compatible way this string will be
   * changed. It otherwise has no semantic meaning.
   */
  format: 'wishlist.v1';

  /**
   * The name of the wish list itself, as a plain string. e.g. "Voltron".
   */
  name: string;
  /** The description of the wish list itself, as a plain string. */
  description: string;

  /** Information about the author(s) of this wish list. */
  authors?: Author[];

  /**
   * URLs of other wish lists that are transitively included into this wishlist.
   * This allows wish lists to be composed of other wish lists, which are then
   * fetched individually. A wish list may specify multiple includes, and no
   * rolls of its own. Wish lists may be in this format, in Little Light's 
   * format, or in the legacy DIM wish list format.
   */
  include?: string[];

  /**
   * UNIX timestamp (milliseconds) representing when this wish list was first
   * created, for display to humans.
   */
  createdTime?: number;
  /**
   * UNIX timestamp (milliseconds) representing when this wish list was last
   * updated, for display to humans. This shouldn't be used to manage cache
   * freshness - use HTTP headers for that.
   */
  updatedTime?: number;

  /*
  * Rolls - these are the various rules that match weapons and perks in order to
    make recommendations. Multiple rolls may apply to a single weapon, and all
    of them will be shown. The order of rolls is not significant.
  */

  /**
   * Per-item-hash rolls - each one specifies one or more rolls that are
   * specific to a particular DestinyInventoryItem. E.g. "These are the god
   * rolls for The Messenger"
   */
  itemRolls?: ItemRoll[];
  /**
   * Perk rolls match specific plug combinations, but without specifying an
   * item. E.g. "Outlaw + Kill Clip is always good"
   */
  perkRolls?: Roll[];
  /**
   * Rolls that apply to any weapons in a specific category. E.g. "Shotguns with
   * Shot Package + Slideshot are always good".
   *
   * If you specify the intrinsic perk hash, you can also specify things like
   * "Adaptive Frame Scout Rifles with Surplus + Demolitionist are good"
   */
  categoryRolls?: CategoryRoll[];
}

/** These tags are meant to match the Little Light JSON wishlist tags. */
type Tag =
  /** This roll is intended for use in PVE */
  | 'PvE'
  /** This roll is intended for use in PVP */
  | 'PvP'
  /** This roll is specifically good for mouse+keyboard users */
  | 'MnK'
  /** This roll is specifically good for controller users */
  | 'Ctrl'
  /**
   * God Roll - "don't you dare throw this away" - not all guns need to have one
   * of these!
   */
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
   * Trash - this sucks, these perks clash - controversial. Makes people very
   * sad when they see it, but like the roll. Allowing users to uncheck tags
   * when importing wish lists may make using this viable.
   */
  | 'Trash'
  // Users are free to specify any other tag
  | string;

interface Roll {
  /**
   * An explanation about this roll. Usually contains a general explanation of
   * the good and bad parts of this weapon.
   */
  description?: string; // e.g. notes
  
  /**
   * Describe a combination of perks, which are really plugs for sockets.
   *
   * ItemHash is the `DestinyInventoryItem` hash for a socket plug. You do not 
   * need to, and should not, include "enhanced" versions of plugs - they will 
   * automatically be matched when you use the hash for the unenhanced version.
   *
   * Each element in the top-level array represents a "group" of perks. The 
   * weapon must have one or more of the perks in each group. In general it is 
   * intended that groups correspond to sockets, but they don't need to.
   * The order of perks in groups, or between groups, is not meaningful. Do not 
   * include empty groups.
   *
   * For a hash in the same group, their relation is OR. For different groups,
   * their relation is AND. (e.g. `[[1, 2], [3, 4, 5]]` means `(1 OR 2) AND (3 OR
   * 4 OR 5)`).
   *
   * Masterworks, Weapon Mod, Shader, and other non-Perk plugs *should not* be
   * included.
   *
   * e.g. For `"Randy's Throwing Knife" <3292795429>`,
   * - `[[247725512, 2387244414]]` is a valid value meaning "the weapon must
   *   have plug 247725512 or 2387244414 available on it".
   *   - Implementers should iterate the groups in `socketEntries`'s `plugSet`
   *     info to determine the actual socket. (Recommended)
   * - `[[247725512], [2387244414]]` is a valid value meaning "the weapon must
   *   have plug 247725512 and 2387244414 available on it on different sockets".
   *
   * Implementers must ignore any invalid combination they can't match either 
   * because the hashes are invalid or the plug set does not include those plugs.
   */
  plugs: ItemHash[][];

  /**
   * Optionally, one or more masterwork stats can be chosen which must also be
   * present for this roll to match. This is more convenient than having to
   * specify 10 plug hashes per masterwork stat.
   */
  masterworkStats?: StatHash[];

  /**
   * Tag for the current combination. This can be used to show special flair on
   * the item, as a search filter, or to allow users to select which types of
   * tags they want to import from a wishlist.
   *
   * All tags that are not ReservedTags should be treated as user-defined tags.
   */
  tags?: Tag[];
}

interface ItemRoll extends Roll {
  /** Inventory item hash this roll applies to. */
  hash: ItemHash;
}

interface CategoryRoll extends Roll {
  /**
   * The subtypes of items this roll applies to. This allows targeting rolls to
   * "Shotguns" for example.
   */
  categories: DestinyItemSubType[];
  /**
   * Optional intrinsic perk hash, used to narrow this to a specific archetype.
   *
   * If you specify the intrinsic perk hash, you can also specify things like
   * "Adaptive Frame Scout Rifles with Surplus + Demolitionist are good".
   */
  intrinsic?: ItemHash;
}

interface Author {
  /** The name of one of the authors of this wish list. */
  name: string;
  /** An optional URL to a public profile or home page for the author. */
  url?: string;
}
