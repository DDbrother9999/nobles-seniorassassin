import { getDb } from './lib/db.js';

export default async function handler(req, res) {
  const db = await getDb();
  const settingsCollection = db.collection('settings');

  if (req.method === 'GET') {
    try {
      const settings = await settingsCollection.findOne({ _id: 'game' });
      return res.status(200).json({ settings: settings || {} });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'PUT') {
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
