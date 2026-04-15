import { getDb } from './lib/db.js';

export default async function handler(req, res) {
  const db = await getDb();
  const killsCollection = db.collection('kill_events');

  if (req.method === 'GET') {
    try {
      const kills = await killsCollection.find({}).sort({ timestamp: -1 }).toArray();
      return res.status(200).json({ kills });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { targetId, userId, newTargetEmail, killEvent } = req.body;
      
      const session = db.client.startSession();
      try {
        await session.withTransaction(async () => {
          await db.collection('users').updateOne({ _id: targetId }, { $set: { status: 'dead', targetEmail: null } }, { session });
          await db.collection('users').updateOne({ _id: userId }, { $set: { targetEmail: newTargetEmail } }, { session });
          await killsCollection.insertOne(killEvent, { session });
        });
      } finally {
        await session.endSession();
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await killsCollection.deleteMany({});
      return res.status(200).json({ success: true, count: result.deletedCount });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
