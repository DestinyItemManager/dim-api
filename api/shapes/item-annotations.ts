export type TagValue = 'favorite' | 'keep' | 'infuse' | 'junk' | 'archive';

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
}
