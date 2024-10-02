import {
  Fields,
  arrayOf,
  bool,
  enumType,
  itemType,
  objectType,
  string,
  timestampMilliseconds,
  timestampSeconds,
  uuid,
} from '@stately-cloud/schema';
import { DestinyClass, DestinyVersion, HashID, ItemID, ProfileID, uint32 } from './types.js';

export const SocketOverride = objectType('SocketOverride', {
  fields: {
    /** The index of the socket in the item */
    socketIndex: { type: uint32, fieldNum: 1, required: false },
    /** The hash of the item that should be in this socket */
    itemHash: { type: HashID, fieldNum: 2 },
  },
});

export const LoadoutItem = objectType('LoadoutItem', {
  fields: {
    /** itemInstanceId of the item (if it's instanced). Default to zero for an uninstanced item or unknown ID. */
    id: { type: ItemID, fieldNum: 1, required: false },
    /** DestinyInventoryItemDefinition hash of the item */
    hash: { type: HashID, fieldNum: 2 },
    /** Optional amount (for consumables), default to zero */
    amount: { type: uint32, fieldNum: 3, required: false },
    /**
     * The socket overrides for the item. These signal what DestinyInventoryItemDefinition
     * (by it's hash) is supposed to be socketed into the given socket index.
     */
    socketOverrides: { type: arrayOf(SocketOverride), fieldNum: 4, required: false },
    /**
     * UTC epoch seconds timestamp of when the item was crafted. Used to
     * match up items that have changed instance ID from being reshaped since they
     * were added to the loadout.
     */
    craftedDate: { type: timestampSeconds, fieldNum: 5, required: false },
  },
});

/** normally found inside DestinyLoadoutComponent, mapped to respective definition tables */
export const InGameLoadoutIdentifiers = objectType('InGameLoadoutIdentifiers', {
  fields: {
    colorHash: { type: HashID, fieldNum: 1 },
    iconHash: { type: HashID, fieldNum: 2 },
    nameHash: { type: HashID, fieldNum: 3 },
  },
});

// These are reused in LoadoutShare
export const loadoutFields: Fields = {
  /** Name/title for the loadout. */
  name: { type: string, fieldNum: 2 },
  /** Optional longform notes about the loadout. */
  notes: { type: string, fieldNum: 3, required: false },
  /**
   * DestinyClass enum value for the class this loadout is restricted
   * to. This is optional (set to Unknown for loadouts that can be used anywhere).
   */
  classType: { type: DestinyClass, fieldNum: 4, required: false },
  /** List of equipped items in the loadout */
  equipped: { type: arrayOf(LoadoutItem), fieldNum: 5, required: false },
  /** List of unequipped items in the loadout */
  unequipped: { type: arrayOf(LoadoutItem), fieldNum: 6, required: false },
  /** Information about the desired properties of this loadout - used to drive the Loadout Optimizer or apply Mod Loadouts */
  parameters: { type: LoadoutParameters, fieldNum: 7, required: false },

  /** When was this Loadout initially created? Tracked automatically by the API - when saving a loadout this field is ignored. */
  createdAt: { type: timestampMilliseconds, fieldNum: 8, fromMetadata: 'createdAtTime' },
  /** When was this Loadout last changed? Tracked automatically by the API - when saving a loadout this field is ignored. */
  lastUpdatedAt: { type: timestampMilliseconds, fieldNum: 9, fromMetadata: 'lastModifiedAtTime' },

  destinyVersion: { type: DestinyVersion, fieldNum: 10 },
  profileId: { type: ProfileID, fieldNum: 11 },
};

export const Loadout = itemType('Loadout', {
  keyPath: [
    // We put this under a profile and a destiny version so we can get all
    // loadouts for a particular destiny version in one query.
    '/p-:profileId/d-:destinyVersion/loadout-:id',
    // Technically loadouts are meant to be globally unique by ID, and we could
    // add this alias to enforce that. But it doesn't seem too important since
    // we never actually need to operate on them by ID.
    // '/loadout-:id'
  ],
  fields: {
    /**
     * A globally unique (UUID) identifier for the loadout. Chosen by the client, not autogenerated by the DB.
     */
    id: { type: uuid, fieldNum: 1 },
    ...loadoutFields,
  },
});

/** Whether armor of this type will have assumed masterworked stats in the Loadout Optimizer. */
export function AssumeArmorMasterwork() {
  return enumType('AssumeArmorMasterwork', {
    /** No armor will have assumed masterworked stats. */
    None: 0,
    /** Only legendary armor will have assumed masterworked stats. */
    Legendary: 1,
    /** All armor (legendary & exotic) will have assumed masterworked stats. */
    All: 2,
    /** All armor (legendary & exotic) will have assumed masterworked stats, and Exotic Armor will be upgraded to have an artifice mod slot. */
    ArtificeExotic: 3,
  });
}

/** How the loadouts menu and page should be sorted */
export const LoadoutSort = enumType('LoadoutSort', {
  ByEditTime: 0,
  ByName: 1,
});

export function ModsByBucketEntry() {
  return objectType('ModsByBucketEntry', {
    fields: {
      bucketHash: { type: HashID, fieldNum: 1 },
      modHashes: { type: arrayOf(HashID), fieldNum: 2, required: false },
    },
  });
}

export function ArtifactUnlocks() {
  return objectType('ArtifactUnlocks', {
    fields: {
      /** The item hashes of the unlocked artifact perk items. */
      unlockedItemHashes: { type: arrayOf(HashID), fieldNum: 1, required: false },
      /** The season this set of artifact unlocks was chosen from. */
      seasonNumber: { type: uint32, fieldNum: 2 },
    },
  });
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
export function LoadoutParameters() {
  return objectType('LoadoutParameters', {
    fields: {
      /**
       * The stats the user cared about for this loadout, in the order they cared about them and
       * with optional range by tier. If a stat is "ignored" it should just be missing from this
       * list.
       */
      statConstraints: { type: arrayOf(StatConstraint), fieldNum: 1, required: false },

      /**
       * The mods that will be used with this loadout. Each entry is an inventory
       * item hash representing the mod item. Hashes may appear multiple times.
       * These are not associated with any specific item in the loadout - when
       * applying the loadout we should automatically determine the minimum of
       * changes required to match the desired mods, and apply these mods to the
       * equipped items.
       */
      mods: { type: arrayOf(HashID), fieldNum: 2, required: false },

      /**
       * If set, after applying the mods above, all other mods will be removed from armor.
       */
      clearMods: { type: bool, fieldNum: 3 },

      /** Whether to clear out other weapons when applying this loadout */
      clearWeapons: { type: bool, fieldNum: 4 },

      /** Whether to clear out other weapons when applying this loadout */
      clearArmor: { type: bool, fieldNum: 5 },

      /**
       * Mods that must be applied to a specific bucket hash. In general, prefer to
       * use the flat mods list above, and rely on the loadout function to assign
       * mods automatically. However there are some mods like shaders which can't
       * be automatically assigned to the right piece. These only apply to the equipped
       * item.
       */
      modsByBucket: { type: arrayOf(ModsByBucketEntry), fieldNum: 6, required: false },

      /** The artifact unlocks relevant to this build. */
      artifactUnlocks: { type: ArtifactUnlocks, fieldNum: 7, required: false },

      /** Whether to automatically add stat mods. */
      autoStatMods: { type: bool, fieldNum: 8 },

      /**
       * A search filter applied while editing the loadout in Loadout Optimizer,
       * which constrains the items that can be in the loadout.
       */
      query: { type: string, fieldNum: 9, required: false },

      /**
       * Whether armor of this type will have assumed masterwork stats in the Loadout Optimizer.
       */
      assumeArmorMasterwork: { type: AssumeArmorMasterwork, fieldNum: 10, required: false },

      /**
       * The InventoryItemHash of the pinned exotic, if any was chosen.
       */
      exoticArmorHash: { type: HashID, fieldNum: 11, required: false },

      /**
       * a user may optionally specify which icon/color/name will be used,
       * if this DIM loadout is saved to an in-game slot.
       */
      inGameIdentifiers: { type: InGameLoadoutIdentifiers, fieldNum: 12, required: false },

      /**
       * When calculating loadout stats, should "Font of ..." mods be assumed active
       * and their runtime bonus stats be included?
       */
      includeRuntimeStatBenefits: { type: bool, fieldNum: 13 },
    },
  });
}

/** A constraint on the values an armor stat can take */
export function StatConstraint() {
  return objectType('StatConstraint', {
    fields: {
      /** The stat definition hash of the stat */
      statHash: { type: HashID, fieldNum: 1 },
      /** The minimum tier value for the stat. 0 if unset. */
      minTier: { type: uint32, fieldNum: 2, required: false, valid: 'this <= 10 && this >= 0' },
      /** The maximum tier value for the stat. 10 if unset. */
      maxTier: { type: uint32, fieldNum: 3, required: false, valid: 'this <= 10 && this >= 0' },
    },
  });
}
