import { nodeTransport } from '@stately-cloud/client/node';
import { createClient } from './generated/index.js';

/**
 * Our StatelyDB client, bound to our types and store.
 */
export const client = createClient({
  storeId: BigInt(process.env.STATELY_STORE_ID!),
  region: process.env.STATELY_REGION || 'us-west-2',
  transport: nodeTransport,
});
