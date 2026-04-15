import { getDb } from './lib/db.js';
import { authenticateRequest, authenticateAdmin } from './lib/verifyAuth.js';

export default async function handler(req, res) {
  const db = await getDb();
  const killsCollection = db.collection('kill_events');

  if (req.method === 'GET') {
    try {
      const settings = await db.collection('settings').findOne({ _id: 'game' });
      if (!settings || !settings.isLedgerPublic) {
        try {
          await authenticateAdmin(req);
        } catch (err) {
          return res.status(403).json({ error: 'Ledger is private' });
        }
      }

      const kills = await killsCollection.find({}).sort({ timestamp: -1 }).toArray();
      return res.status(200).json({ kills });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      let decodedToken;
      try {
        decodedToken = await authenticateRequest(req);
      } catch (err) {
        return res.status(401).json({ error: err.message });
      }

      const { targetId, userId, killEvent } = req.body;
      
      if (!killEvent || killEvent.killerEmail !== decodedToken.email) {
        return res.status(403).json({ error: 'Forbidden: You can only log kills for yourself.' });
      }

      const session = db.client.startSession();
      try {
        await session.withTransaction(async () => {
          const victim = await db.collection('users').findOne({ _id: targetId }, { session });
          if (!victim) throw new Error("Victim not found");

          const newTargetEmail = victim.targetEmail;
          let newTargetName = "None";
          if (newTargetEmail) {
            const newTargDoc = await db.collection('users').findOne({ _id: newTargetEmail }, { session });
            if (newTargDoc) newTargetName = `${newTargDoc.firstName} ${newTargDoc.lastName}`;
          }

          if (killEvent) {
            killEvent.newTargetEmail = newTargetEmail;
            killEvent.newTargetName = newTargetName;
            await killsCollection.insertOne(killEvent, { session });
          }

          await db.collection('users').updateOne({ _id: targetId }, { $set: { status: 'dead', targetEmail: null } }, { session });
          await db.collection('users').updateOne({ _id: userId }, { $set: { targetEmail: newTargetEmail } }, { session });
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
      try {
        await authenticateAdmin(req);
      } catch (err) {
        return res.status(401).json({ error: err.message });
      }

      const result = await killsCollection.deleteMany({});
      return res.status(200).json({ success: true, count: result.deletedCount });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
