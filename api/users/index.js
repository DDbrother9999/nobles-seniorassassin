import { getDb } from '../lib/db.js';

export default async function handler(req, res) {
  const db = await getDb();
  const usersCollection = db.collection('users');

  if (req.method === 'GET') {
    try {
      const users = await usersCollection.find({}).toArray();
      users.forEach(u => u.email = u._id);
      return res.status(200).json({ users });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
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
