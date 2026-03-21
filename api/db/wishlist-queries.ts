import { ClientBase, QueryResult } from 'pg';
import { WishlistMetadata, WishlistRoll } from '../shapes/wishlist.js';

export interface WishlistRow {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: Date;
  last_updated_at: Date;
}

export interface WishlistRollRow {
  id: string;
  wishlist_id: string;
  item_hash: string;
  recommended_perks: number[][];
  is_expert_mode: boolean;
  is_undesirable: boolean;
  notes: string | null;
  created_at: Date;
  last_updated_at: Date;
}

/**
 * Get all wishlists for a user.
 */
export async function getWishlistsForUser(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<WishlistMetadata[]> {
  const results = await client.query<WishlistRow>({
    name: 'get_wishlists_for_user',
    text: 'SELECT id, name, description, is_public, created_at, last_updated_at FROM wishlists WHERE membership_id = $1',
    values: [bungieMembershipId],
  });
  return results.rows.map(convertWishlist);
}

/**
 * Get all rolls for all wishlists of a user.
 */
export async function getWishlistRollsForUser(
  client: ClientBase,
  bungieMembershipId: number,
): Promise<WishlistRoll[]> {
  const results = await client.query<WishlistRollRow>({
    name: 'get_wishlist_rolls_for_user',
    text: 'SELECT id, wishlist_id, item_hash, recommended_perks, is_expert_mode, is_undesirable, notes, created_at, last_updated_at FROM wishlist_rolls WHERE membership_id = $1',
    values: [bungieMembershipId],
  });
  return results.rows.map(convertWishlistRoll);
}

/**
 * Get a public wishlist and its rolls.
 */
export async function getPublicWishlist(
  client: ClientBase,
  wishlistId: string,
): Promise<{ wishlist: WishlistMetadata; rolls: WishlistRoll[] } | undefined> {
  const wishlistResult = await client.query<WishlistRow>({
    name: 'get_public_wishlist',
    text: 'SELECT id, name, description, is_public, created_at, last_updated_at FROM wishlists WHERE id = $1 AND is_public = TRUE',
    values: [wishlistId],
  });

  if (wishlistResult.rowCount === 0) {
    return undefined;
  }

  const wishlist = convertWishlist(wishlistResult.rows[0]);

  const rollsResult = await client.query<WishlistRollRow>({
    name: 'get_public_wishlist_rolls',
    text: 'SELECT id, wishlist_id, item_hash, recommended_perks, is_expert_mode, is_undesirable, notes, created_at, last_updated_at FROM wishlist_rolls WHERE wishlist_id = $1',
    values: [wishlistId],
  });

  const rolls = rollsResult.rows.map(convertWishlistRoll);

  return { wishlist, rolls };
}

function convertWishlist(row: WishlistRow): WishlistMetadata {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    isPublic: row.is_public,
    createdAt: row.created_at.getTime(),
    lastUpdatedAt: row.last_updated_at.getTime(),
  };
}

function convertWishlistRoll(row: WishlistRollRow): WishlistRoll {
  return {
    id: row.id,
    wishlistId: row.wishlist_id,
    itemHash: parseInt(row.item_hash, 10),
    recommendedPerks: row.recommended_perks,
    isExpertMode: row.is_expert_mode,
    isUndesirable: row.is_undesirable,
    notes: row.notes || undefined,
    createdAt: row.created_at.getTime(),
    lastUpdatedAt: row.last_updated_at.getTime(),
  };
}

/**
 * Upsert a wishlist.
 */
export async function updateWishlist(
  client: ClientBase,
  bungieMembershipId: number,
  wishlist: WishlistMetadata,
): Promise<QueryResult> {
  return client.query({
    name: 'upsert_wishlist',
    text: `INSERT INTO wishlists (id, membership_id, name, description, is_public)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (membership_id, id)
           DO UPDATE SET name = $3, description = $4, is_public = $5`,
    values: [
      wishlist.id,
      bungieMembershipId,
      wishlist.name,
      wishlist.description || null,
      wishlist.isPublic,
    ],
  });
}

/**
 * Hard delete a wishlist.
 */
export async function deleteWishlist(
  client: ClientBase,
  bungieMembershipId: number,
  wishlistId: string,
): Promise<QueryResult> {
  return client.query({
    name: 'delete_wishlist',
    text: 'DELETE FROM wishlists WHERE membership_id = $1 AND id = $2',
    values: [bungieMembershipId, wishlistId],
  });
}

/**
 * Upsert a wishlist roll.
 */
export async function updateWishlistRoll(
  client: ClientBase,
  bungieMembershipId: number,
  wishlistId: string,
  roll: WishlistRoll,
): Promise<QueryResult> {
  return client.query({
    name: 'upsert_wishlist_roll',
    text: `INSERT INTO wishlist_rolls (id, wishlist_id, membership_id, item_hash, recommended_perks, is_expert_mode, is_undesirable, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (membership_id, id)
           DO UPDATE SET wishlist_id = $2, item_hash = $4, recommended_perks = $5, is_expert_mode = $6, is_undesirable = $7, notes = $8`,
    values: [
      roll.id,
      wishlistId,
      bungieMembershipId,
      roll.itemHash,
      JSON.stringify(roll.recommendedPerks),
      roll.isExpertMode,
      roll.isUndesirable,
      roll.notes || null,
    ],
  });
}

/**
 * Hard delete a wishlist roll.
 */
export async function deleteWishlistRoll(
  client: ClientBase,
  bungieMembershipId: number,
  rollId: string,
): Promise<QueryResult> {
  return client.query({
    name: 'delete_wishlist_roll',
    text: 'DELETE FROM wishlist_rolls WHERE membership_id = $1 AND id = $2',
    values: [bungieMembershipId, rollId],
  });
}
