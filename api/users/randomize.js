import { getDb } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const usersCollection = db.collection('users');

    const aliveUsers = await usersCollection.find({ status: 'alive' }).toArray();
    
    if (aliveUsers.length < 2) {
      return res.status(400).json({ error: 'Not enough alive players to assign targets.' });
    }

    let shuffled = [...aliveUsers];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const operations = [];
    for (let i = 0; i < shuffled.length; i++) {
        const currentUser = shuffled[i];
        const targetUser = i === shuffled.length - 1 ? shuffled[0] : shuffled[i + 1];
        operations.push({
          updateOne: {
            filter: { _id: currentUser._id },
            update: { $set: { targetEmail: targetUser._id } }
          }
        });
    }

    await usersCollection.bulkWrite(operations);
    return res.status(200).json({ success: true, count: shuffled.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
