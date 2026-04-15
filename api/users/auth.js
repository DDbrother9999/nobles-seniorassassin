import { getDb } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const db = await getDb();
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
    const isAdmin = adminEmails.includes(email);

    let user = await db.collection('users').findOne({ _id: email });

    if (!user && !isAdmin) {
      return res.status(403).json({ error: 'Access Denied: You are not on the official roster.' });
    }

    if (!user && isAdmin) {
      user = {
        _id: email,
        firstName: 'Admin',
        lastName: 'Account',
        status: 'alive',
        targetEmail: null,
      };
    }

    user.email = user._id;
    if (isAdmin) {
      user.isAdmin = true;
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Auth Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
