import { getDb } from './lib/db.js';
import { authenticateAdmin } from './lib/verifyAuth.js';

export default async function handler(req, res) {
  const db = await getDb();
  const settingsCollection = db.collection('settings');

  if (req.method === 'GET') {
    try {
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      const settings = await settingsCollection.findOne({ _id: 'game' });
      return res.status(200).json({ settings: settings || {} });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      await authenticateAdmin(req);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    try {
      const updates = req.body;
      await settingsCollection.updateOne(
        { _id: 'game' },
        { $set: updates },
        { upsert: true }
      );
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
