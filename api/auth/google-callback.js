import { getDb } from '../lib/db.js';
import admin from 'firebase-admin';

// Initialize firebase-admin if not already done.
// createCustomToken requires a service account key to sign JWTs —
// FIREBASE_SERVICE_ACCOUNT should be the full JSON content of the downloaded key file.
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error } = req.query;

  // Google returned an error (e.g. user cancelled)
  if (error) {
    return res.redirect(302, `/?auth_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return res.redirect(302, '/?auth_error=missing_params');
  }

  const db = await getDb();

  // Validate the state token against what we stored — prevents CSRF.
  const storedState = await db.collection('oauth_states').findOne({ state });
  if (!storedState) {
    return res.redirect(302, '/?auth_error=invalid_state');
  }
  // Delete the used state so it can't be replayed.
  await db.collection('oauth_states').deleteOne({ state });

  // Exchange the authorization code for a Google access token.
  let googleEmail;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('Token exchange failed:', text);
      return res.redirect(302, '/?auth_error=token_exchange_failed');
    }

    const tokenData = await tokenRes.json();

    // Decode the ID token payload to get the user's email.
    // We verify via Google's userinfo endpoint instead of trusting the raw JWT.
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      return res.redirect(302, '/?auth_error=userinfo_failed');
    }

    const userInfo = await userInfoRes.json();
    googleEmail = userInfo.email;

    if (!googleEmail) {
      return res.redirect(302, '/?auth_error=no_email');
    }
  } catch (err) {
    console.error('OAuth callback error:', err);
    return res.redirect(302, '/?auth_error=server_error');
  }

  // Create a Firebase custom token for this email.
  // The frontend will exchange this for a full Firebase session via signInWithCustomToken.
  let customToken;
  try {
    // Use the email as the uid so it stays consistent with existing user records.
    customToken = await admin.auth().createCustomToken(googleEmail, { email: googleEmail });
  } catch (err) {
    console.error('Custom token creation failed:', err);
    return res.redirect(302, '/?auth_error=token_creation_failed');
  }

  // Redirect back to the app with the short-lived custom token.
  // The token is one-time-use and expires in 1 hour.
  return res.redirect(302, `/?token=${encodeURIComponent(customToken)}`);
}
