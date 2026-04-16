import admin from 'firebase-admin';

// Initialize the app if it hasn't been already
// Vercel serverless functions can boot multiple times.
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'seniorassassin-ddbrother'
  });
}

/**
 * Extracts and verifies the Firebase ID token from the incoming request.
 * Throws an error if the token is missing, malformed, or invalid.
 * Returns the decoded token containing the user's email.
 */
export async function authenticateRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    // For custom tokens (server-side OAuth), the uid IS the email string.
    // For standard Google sign-ins, the email claim is at the top level.
    // Normalize so all downstream code can always use decodedToken.email.
    const resolvedEmail = decodedToken.email || decodedToken.uid;
    if (!resolvedEmail) {
      throw new Error('Invalid token details');
    }
    decodedToken.email = resolvedEmail;
    return decodedToken;
  } catch (error) {
    throw new Error('VerifyToken failed: ' + error.message);
  }
}

/**
 * Ensures the requester is authenticated AND in the ADMIN_EMAILS list.
 * Throws an error if not authorized.
 * Returns the decoded token.
 */
export async function authenticateAdmin(req) {
  const decodedToken = await authenticateRequest(req);
  
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
  if (!adminEmails.includes(decodedToken.email)) {
    throw new Error('Admin Access Denied');
  }
  
  return decodedToken;
}
