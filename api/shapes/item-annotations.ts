export type TagValue = 'favorite' | 'keep' | 'infuse' | 'junk' | 'archive';

/** Any extra info added by the user to individual items - tags, notes, etc. */
export interface ItemAnnotation {
  /** The item instance ID for an individual item */
  id: string;
  /** Optional tag for the item. */
  tag?: TagValue | null;
  /** Optional text notes on the item. */
  notes?: string | null;
}

/** Any extra info added by the user to item hashes (shaders, basically) */
export interface ItemHashTag {
  /** The inventory item hash for an item */
  hash: number;
  /** Optional tag for the item. */
  tag?: TagValue | null;
  /** Optional text notes on the item. */
  notes?: string | null;
}
