export type TagValue = 'favorite' | 'keep' | 'infuse' | 'junk' | 'archive';

export enum TagVariant {
  PVP = 1,
  PVE = 2,
}

/** Any extra info added by the user to individual items - tags, notes, etc. */
export interface ItemAnnotation extends Annotation {
  /** The item instance ID for an individual item */
  id: string;
  /**
   * UTC epoch seconds timestamp of when the item was crafted. Used to
   * match up items that have changed instance ID from being reshaped since they
   * were tagged.
   */
  craftedDate?: number;
}

/** Any extra info added by the user to item hashes (shaders and mods) */
export interface ItemHashTag extends Annotation {
  /** The inventory item hash for an item */
  hash: number;
}

interface Annotation {
  /** Optional tag for the item. */
  tag?: TagValue | null;
  /** Optional text notes on the item. */
  notes?: string | null;
  /**
   * An optional "variant" for the tag that only has meaning if the tag is set.
   * This provides a backwards and forwards compatible way to say a roll is
   * "Keep-PVP" or "Keep-PVE". Clients that don't understand this flag will
   * simply show "Keep". This is only really meant to be used with the "keep"
   * tag.
   */
  v?: TagVariant;
}
