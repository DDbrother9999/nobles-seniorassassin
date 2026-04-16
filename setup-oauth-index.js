/**
 * One-time setup script: creates TTL index on the oauth_states collection
 * so state tokens auto-expire after 10 minutes.
 *
 * Run once with: node setup-oauth-index.js
 */
import { getDb } from './api/lib/db.js';

const db = await getDb();
await db.collection('oauth_states').createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 600 } // 10 minutes
);
console.log('TTL index created on oauth_states.createdAt');
process.exit(0);
