import { getDb } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const result = await db.collection('users').updateMany(
      {},
      { $set: { status: 'alive' } }
    );
    return res.status(200).json({ success: true, count: result.modifiedCount });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
