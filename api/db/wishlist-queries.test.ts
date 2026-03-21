import { v4 as uuid } from 'uuid';
import { WishlistMetadata, WishlistRoll } from '../shapes/wishlist.js';
import { closeDbPool, transaction } from './index.js';
import {
  deleteWishlist,
  deleteWishlistRoll,
  getPublicWishlist,
  getWishlistRollsForUser,
  getWishlistsForUser,
  updateWishlist,
  updateWishlistRoll,
} from './wishlist-queries.js';

const bungieMembershipId = 9999;

beforeEach(() =>
  transaction(async (client) => {
    await client.query(`delete from wishlist_rolls where membership_id = ${bungieMembershipId}`);
    await client.query(`delete from wishlists where membership_id = ${bungieMembershipId}`);
  }),
);

afterAll(async () => closeDbPool());

const wishlist: WishlistMetadata = {
  id: uuid(),
  name: 'Test Wishlist',
  description: 'A description',
  isPublic: false,
};

const roll: WishlistRoll = {
  id: uuid(),
  wishlistId: wishlist.id,
  itemHash: 123456789,
  recommendedPerks: [[1, 2], [3]],
  isExpertMode: false,
  isUndesirable: false,
  notes: 'Good roll',
};

it('can record and retrieve a wishlist', async () => {
  await transaction(async (client) => {
    await updateWishlist(client, bungieMembershipId, wishlist);

    const wishlists = await getWishlistsForUser(client, bungieMembershipId);

    expect(wishlists.length).toBe(1);
    expect(wishlists[0].name).toBe(wishlist.name);
    expect(wishlists[0].description).toBe(wishlist.description);
    expect(wishlists[0].isPublic).toBe(wishlist.isPublic);
    expect(wishlists[0].createdAt).toBeDefined();
    expect(wishlists[0].lastUpdatedAt).toBeDefined();
  });
});

it('can update a wishlist', async () => {
  await transaction(async (client) => {
    await updateWishlist(client, bungieMembershipId, wishlist);

    const updatedWishlist = { ...wishlist, name: 'Updated Name', isPublic: true };
    await updateWishlist(client, bungieMembershipId, updatedWishlist);

    const wishlists = await getWishlistsForUser(client, bungieMembershipId);

    expect(wishlists.length).toBe(1);
    expect(wishlists[0].name).toBe('Updated Name');
    expect(wishlists[0].isPublic).toBe(true);
  });
});

it('can delete a wishlist', async () => {
  await transaction(async (client) => {
    await updateWishlist(client, bungieMembershipId, wishlist);
    await deleteWishlist(client, bungieMembershipId, wishlist.id);

    const wishlists = await getWishlistsForUser(client, bungieMembershipId);
    expect(wishlists.length).toBe(0);

    // Verify it is physically gone from the DB
    const result = await client.query('SELECT * FROM wishlists WHERE id = $1', [wishlist.id]);
    expect(result.rowCount).toBe(0);
  });
});

it('can record and retrieve a wishlist roll', async () => {
  await transaction(async (client) => {
    await updateWishlist(client, bungieMembershipId, wishlist);
    await updateWishlistRoll(client, bungieMembershipId, wishlist.id, roll);

    const rolls = await getWishlistRollsForUser(client, bungieMembershipId);

    expect(rolls.length).toBe(1);
    expect(rolls[0].itemHash).toBe(roll.itemHash);
    expect(rolls[0].recommendedPerks).toEqual(roll.recommendedPerks);
    expect(rolls[0].notes).toBe(roll.notes);
    expect(rolls[0].wishlistId).toBe(wishlist.id);
  });
});

it('can delete a wishlist roll', async () => {
  await transaction(async (client) => {
    await updateWishlist(client, bungieMembershipId, wishlist);
    await updateWishlistRoll(client, bungieMembershipId, wishlist.id, roll);

    await deleteWishlistRoll(client, bungieMembershipId, roll.id);

    const rolls = await getWishlistRollsForUser(client, bungieMembershipId);
    expect(rolls.length).toBe(0);

    // Verify it is physically gone from the DB
    const result = await client.query('SELECT * FROM wishlist_rolls WHERE id = $1', [roll.id]);
    expect(result.rowCount).toBe(0);
  });
});

it('can retrieve a public wishlist', async () => {
  await transaction(async (client) => {
    const publicWishlist = { ...wishlist, isPublic: true };
    await updateWishlist(client, bungieMembershipId, publicWishlist);
    await updateWishlistRoll(client, bungieMembershipId, publicWishlist.id, roll);

    const result = await getPublicWishlist(client, publicWishlist.id);

    expect(result).toBeDefined();
    expect(result?.wishlist.name).toBe(publicWishlist.name);
    expect(result?.rolls.length).toBe(1);
    expect(result?.rolls[0].itemHash).toBe(roll.itemHash);
  });
});

it('cannot retrieve a private wishlist via getPublicWishlist', async () => {
  await transaction(async (client) => {
    await updateWishlist(client, bungieMembershipId, wishlist);
    const result = await getPublicWishlist(client, wishlist.id);
    expect(result).toBeUndefined();
  });
});
