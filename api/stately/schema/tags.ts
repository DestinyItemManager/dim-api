import { Fields, enumType, itemType, string, timestampMilliseconds } from '@stately-cloud/schema';
import { DestinyVersion, HashID, ItemID, ProfileID } from './types.js';

export const TagValue = enumType('TagValue', {
  favorite: 1,
  keep: 2,
  infuse: 3,
  junk: 4,
  archive: 5,
});

// Both ItemAnnotation and ItemHashTag share these fields.
const sharedFields: Fields = {
  /** The profile ID for a Destiny profile. */
  profileId: {
    type: ProfileID,
    fieldNum: 1,
  },

  destinyVersion: {
    type: DestinyVersion,
    fieldNum: 2,
  },

  /** Optional tag for the item. */
  tag: {
    type: TagValue,
    fieldNum: 3,
    required: false,
  },

  /** Optional text notes on the item. */
  notes: {
    type: string,
    fieldNum: 4,
    required: false,
  },
};

/** Any extra info added by the user to individual items - tags, notes, etc. */
export const ItemAnnotation = itemType('ItemAnnotation', {
  keyPath: '/p-:profileId/d-:destinyVersion/ia-:id',
  fields: {
    ...sharedFields,

    /** The item instance ID for an individual item */
    id: {
      type: ItemID,
      // We still need to make sure these don't collide with the IDs in sharedFields.
      fieldNum: 5,
    },

    /**
     * UTC epoch seconds timestamp of when the item was crafted. Used to
     * match up items that have changed instance ID from being reshaped since they
     * were tagged.
     */
    craftedDate: {
      type: timestampMilliseconds,
      // We still need to make sure these don't collide with the IDs in sharedFields.
      fieldNum: 6,
      required: false,
    },
  },
});

/** Any extra info added by the user to item hashes (shaders and mods) */
export const ItemHashTag = itemType('ItemHashTag', {
  keyPath: '/p-:profileId/d-:destinyVersion/iht-:hash',
  fields: {
    ...sharedFields,
    // destinyVersion is always 2

    /** The inventory item hash for an item */
    hash: {
      type: HashID,
      fieldNum: 5,
    },
  },
});
