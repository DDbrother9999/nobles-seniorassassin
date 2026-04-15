import { getDb } from '../lib/db.js';
import { authenticateAdmin } from '../lib/verifyAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await authenticateAdmin(req);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  const { userId, updates } = req.body;
  if (!userId || !updates) {
    return res.status(400).json({ error: 'Missing userId or updates in payload' });
  }

  try {
    const db = await getDb();
    await db.collection('users').updateOne(
      { _id: userId },
      { $set: updates }
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
