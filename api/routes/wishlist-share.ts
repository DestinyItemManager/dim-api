import asyncHandler from 'express-async-handler';
import { readTransaction } from '../db/index.js';
import { getPublicWishlist } from '../db/wishlist-queries.js';
import { metrics } from '../metrics/index.js';
import { WishList } from '../shapes/wishlist.js';

/**
 * Get a public wishlist by its ID and return it in the wishlist JSON format.
 */
export const wishlistShareHandler = asyncHandler(async (req, res) => {
  const wishlistId = req.params.wishlistId;

  if (!wishlistId) {
    res.status(400).send({ error: 'Missing wishlistId' });
    return;
  }

  const result = await readTransaction(async (client) => getPublicWishlist(client, wishlistId));

  if (!result) {
    res.status(404).send({ error: 'Wishlist not found or not public' });
    return;
  }

  const { wishlist, rolls } = result;
  metrics.increment('wishlist_share.download', 1);

  const response: WishList = {
    format: 'wishlist.v1',
    name: wishlist.name,
    description: wishlist.description || '',
    itemRolls: rolls.map((roll) => ({
      hash: roll.itemHash,
      plugs: roll.recommendedPerks,
      description: roll.notes,
      tags: roll.isUndesirable ? ['Trash'] : roll.isExpertMode ? ['Godroll'] : ['Recommended'],
    })),
  };

  res.send(response);
});
