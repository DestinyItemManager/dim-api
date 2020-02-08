export type TagValue = 'favorite' | 'keep' | 'infuse' | 'junk' | 'archive';

/** Any extra info added by the user to individual items - tags, notes, etc. */
export interface ItemAnnotation {
  /** The instance ID for an individual item */
  itemInstanceId: '12345';
  /** Optional tag for the item. */
  tag?: 'favorite';
  /** Optional text notes on the item. */
  notes?: 'This is a cool gun.';
}
