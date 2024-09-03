import { createClient } from './generated/stately_item_types.js';

/**
 * Our StatelyDB client, bound to our types and store.
 */
export const client = createClient(BigInt(process.env.STATELY_STORE_ID!));
