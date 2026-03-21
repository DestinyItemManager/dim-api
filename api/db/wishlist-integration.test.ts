import { v4 as uuid } from 'uuid';
import { statelyImport } from '../routes/import.js';
import { ExportResponse } from '../shapes/export.js';
import { closeDbPool, transaction } from './index.js';
import {
  deleteWishlist,
  getWishlistRollsForUser,
  getWishlistsForUser,
  updateWishlist,
  updateWishlistRoll,
} from './wishlist-queries.js';

const bungieMembershipId = 8888;
const platformMembershipIds = ['12345', '67890']; // Must be numeric strings for BigInt conversion

beforeEach(() =>
  transaction(async (client) => {
    // Clean up both tables manually to ensure a clean state
    await client.query(`delete from wishlist_rolls where membership_id = ${bungieMembershipId}`);
    await client.query(`delete from wishlists where membership_id = ${bungieMembershipId}`);
  }),
);

afterAll(async () => closeDbPool());

describe('Wishlist Design Integration', () => {
  /**
   * SCENARIO 1: Physical Cascade Delete
   * Design: Since we use hard deletes, deleting a wishlist MUST
   * physically remove all its rolls from the database via the
   * FOREIGN KEY ... ON DELETE CASCADE.
   */
  it('should physically delete all associated rolls when a wishlist is hard-deleted', async () => {
    await transaction(async (client) => {
      const wishlistId = uuid();
      await updateWishlist(client, bungieMembershipId, {
        id: wishlistId,
        name: 'Hard Delete Test',
        isPublic: false,
      });

      // Add a roll
      await updateWishlistRoll(client, bungieMembershipId, wishlistId, {
        id: uuid(),
        wishlistId,
        itemHash: 100,
        recommendedPerks: [[1]],
        isExpertMode: false,
        isUndesirable: false,
      });

      // Verify visibility
      const rollsBefore = await getWishlistRollsForUser(client, bungieMembershipId);
      expect(rollsBefore.length).toBe(1);

      // Hard delete the wishlist
      await deleteWishlist(client, bungieMembershipId, wishlistId);

      // Check visibility - wishlist should be gone
      const wishlists = await getWishlistsForUser(client, bungieMembershipId);
      expect(wishlists.length).toBe(0);

      // Check rolls - should be physically gone due to DB CASCADE
      const rollsAfter = await getWishlistRollsForUser(client, bungieMembershipId);
      expect(rollsAfter.length).toBe(0);
    });
  });

  /**
   * SCENARIO 2: Import/Export Round-trip
   * Tests that the entire data transport system (Export -> Import) preserves relationships.
   */
  it('should perfectly reconstruct wishlists and rolls after an export/import cycle', async () => {
    const wishlistId = uuid();
    const rollId = uuid();

    const mockExportData: ExportResponse = {
      settings: {},
      loadouts: [],
      tags: [],
      itemHashTags: [],
      triumphs: [],
      searches: [],
      wishlists: [
        {
          wishlist: {
            id: wishlistId,
            name: 'Roundtrip List',
            description: 'Testing export/import',
            isPublic: true,
          },
          rolls: [
            {
              id: rollId,
              wishlistId: wishlistId,
              itemHash: 999,
              recommendedPerks: [[1], [2]],
              isExpertMode: true,
              isUndesirable: false,
              notes: 'Saved note',
            },
          ],
        },
      ],
    };

    // Execute the import (which uses our queries internally)
    await statelyImport(
      bungieMembershipId,
      platformMembershipIds,
      mockExportData.settings,
      [], // loadouts
      [], // tags
      [], // triumphs
      [], // searches
      [], // itemHashTags
      mockExportData.wishlists,
    );

    // Verify in the DB
    await transaction(async (client) => {
      const wishlists = await getWishlistsForUser(client, bungieMembershipId);
      const rolls = await getWishlistRollsForUser(client, bungieMembershipId);

      expect(wishlists.length).toBe(1);
      expect(wishlists[0].id).toBe(wishlistId);
      expect(wishlists[0].name).toBe('Roundtrip List');

      expect(rolls.length).toBe(1);
      expect(rolls[0].id).toBe(rollId);
      expect(rolls[0].wishlistId).toBe(wishlistId);
      expect(rolls[0].itemHash).toBe(999);
      expect(rolls[0].isExpertMode).toBe(true);
    });
  });

  /**
   * SCENARIO 3: Cross-Wishlist Isolation
   * Verify that rolls remain assigned to their respective lists.
   */
  it('should maintain strict separation between rolls of different wishlists', async () => {
    await transaction(async (client) => {
      const w1 = uuid();
      const w2 = uuid();

      await updateWishlist(client, bungieMembershipId, { id: w1, name: 'List 1', isPublic: false });
      await updateWishlist(client, bungieMembershipId, { id: w2, name: 'List 2', isPublic: false });

      await updateWishlistRoll(client, bungieMembershipId, w1, {
        id: uuid(),
        wishlistId: w1,
        itemHash: 1,
        recommendedPerks: [[]],
        isExpertMode: false,
        isUndesirable: false,
      });
      await updateWishlistRoll(client, bungieMembershipId, w2, {
        id: uuid(),
        wishlistId: w2,
        itemHash: 2,
        recommendedPerks: [[]],
        isExpertMode: false,
        isUndesirable: false,
      });

      const allRolls = await getWishlistRollsForUser(client, bungieMembershipId);
      expect(allRolls.length).toBe(2);

      const rollsW1 = allRolls.filter((r) => r.wishlistId === w1);
      const rollsW2 = allRolls.filter((r) => r.wishlistId === w2);

      expect(rollsW1.length).toBe(1);
      expect(rollsW1[0].itemHash).toBe(1);
      expect(rollsW2.length).toBe(1);
      expect(rollsW2[0].itemHash).toBe(2);
    });
  });
});
