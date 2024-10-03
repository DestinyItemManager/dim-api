import { FieldDescriptorProto_Type } from '@bufbuild/protobuf/wkt';
import { enumType, type, uint } from '@stately-cloud/schema';

export const uint32 = type('uint32', FieldDescriptorProto_Type.UINT32);
// Normally we'd use sint64, but this field used to be uint32 before I realized
// it included some signed special values.
export const LockedExoticHash = type('LockedExoticHash', FieldDescriptorProto_Type.INT64);

export const ItemID = type('ItemID', uint, { docs: 'The unique ID of an inventory item' });

// Manifest hashes are actually a uint32
export const HashID = type('HashID', uint32, {
  docs: 'The hash ID of a definition',
});

export const MembershipID = type('MembershipID', uint, {
  docs: 'The unique ID of a Bungie.net membership',
});
export const ProfileID = type('ProfileID', uint, {
  docs: 'The unique ID of a Destiny profile. These can be moved between different Bungie.net memberships.',
});

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
