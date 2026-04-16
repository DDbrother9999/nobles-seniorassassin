import { getDb } from '../lib/db.js';
import { randomBytes } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI)' });
  }

  // Generate a cryptographically random state token to prevent CSRF.
  // Stored server-side in MongoDB so no browser storage is involved.
  const state = randomBytes(32).toString('hex');

  const db = await getDb();
  // Store state with a 10-minute TTL. MongoDB TTL index will auto-clean it.
  await db.collection('oauth_states').insertOne({
    state,
    createdAt: new Date(),
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // Force account selection so users can pick their @nobles.edu account.
    prompt: 'select_account',
    hd: 'nobles.edu',
    access_type: 'online',
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return res.redirect(302, googleAuthUrl);
}
