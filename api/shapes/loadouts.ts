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
}
