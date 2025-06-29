import { enumType, ProtoScalarType, type, uint, uint32 } from '@stately-cloud/schema';

// Normally we'd use sint64, but this field used to be uint32 before I realized
// it included some signed special values.
export const LockedExoticHash = type('LockedExoticHash', ProtoScalarType.INT64);

/** The unique ID of an inventory item */
export const ItemID = type('ItemID', uint);

/** The hash ID of a definition */
// Manifest hashes are actually a uint32
export const HashID = type('HashID', uint32);

/** The unique ID of a Bungie.net membership */
export const MembershipID = type('MembershipID', uint);
/** The unique ID of a Destiny profile. These can be moved between different Bungie.net memberships. */
export const ProfileID = type('ProfileID', uint);

// This could be an enum, but it's easy enough as a constrained number.
export const DestinyVersion = type('DestinyVersion', uint32, {
  valid: 'this == uint(1) || this == uint(2)',
});

export const DestinyClass = enumType('DestinyClass', {
  // Normally we wouldn't have a zero-value default, but we're trying to match the Destiny enum
  Titan: 0,
  Hunter: 1,
  Warlock: 2,
  Unknown: 3,
});
