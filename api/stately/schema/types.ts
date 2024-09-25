import { enumType, type, uint } from '@stately-cloud/schema';

export const ItemID = type('ItemID', uint, { docs: 'The unique ID of an inventory item' });

// Manifest hashes are actually a uint32
export const HashID = type('HashID', uint, {
  docs: 'The hash ID of a definition',
});

export const MembershipID = type('MembershipID', uint, {
  docs: 'The unique ID of a Bungie.net membership',
});
export const ProfileID = type('ProfileID', uint, {
  docs: 'The unique ID of a Destiny profile. These can be moved between different Bungie.net memberships.',
});

// This could be an enum, but it's easy enough as a constrained number.
export const DestinyVersion = type('DestinyVersion', uint, {
  valid: 'this == uint(1) || this == uint(2)',
});

export const DestinyClass = enumType('DestinyClass', {
  // Normally we wouldn't have a zero-value default, but we're trying to match the Destiny enum
  Titan: 0,
  Hunter: 1,
  Warlock: 2,
  Unknown: 3,
});
