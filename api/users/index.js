import { getDb } from '../lib/db.js';
import { authenticateRequest, authenticateAdmin } from '../lib/verifyAuth.js';

export default async function handler(req, res) {
  const db = await getDb();
  const usersCollection = db.collection('users');

  if (req.method === 'GET') {
    try {
      let decodedToken;
      try {
        decodedToken = await authenticateRequest(req);
      } catch (err) {
        return res.status(401).json({ error: err.message });
      }

      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
      const isAdmin = adminEmails.includes(decodedToken.email);

      const users = await usersCollection.find({}).toArray();
      users.forEach(u => {
        u.email = u._id;
        if (!isAdmin) {
          delete u.targetEmail;
        }
      });
      return res.status(200).json({ users });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      try {
        await authenticateAdmin(req);
      } catch (err) {
        return res.status(401).json({ error: err.message });
      }

      const { users } = req.body;
      if (!users || !Array.isArray(users)) {
        return res.status(400).json({ error: 'Invalid users array payload.' });
      }

      const operations = users.map(user => ({
        updateOne: {
          filter: { _id: user.email },
          update: { $set: { ...user, _id: user.email } },
          upsert: true
        }
      }));

      await usersCollection.bulkWrite(operations);
      
      return res.status(200).json({ success: true, message: `Imported ${users.length} users.` });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
