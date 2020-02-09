export type TagValue = 'favorite' | 'keep' | 'infuse' | 'junk' | 'archive';

/** Any extra info added by the user to individual items - tags, notes, etc. */
export interface ItemAnnotation {
  /** The item instance ID for an individual item */
  id: string;
  /** Optional tag for the item. */
  tag?: TagValue;
  /** Optional text notes on the item. */
  notes?: string;
}
