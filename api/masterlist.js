import { getDb } from './lib/db.js';
import { authenticateRequest, authenticateAdmin } from './lib/verifyAuth.js';

export default async function handler(req, res) {
  const db = await getDb();
  const masterListCollection = db.collection('masterList');

  // GET — return the full master list
  if (req.method === 'GET') {
    try {
      try {
        await authenticateRequest(req);
      } catch (err) {
        return res.status(401).json({ error: err.message });
      }

      const { q } = req.query;
      let query = {};
      if (q && q.trim()) {
        const regex = new RegExp(q.trim(), 'i');
        query = {
          $or: [
            { firstName: regex },
            { lastName: regex },
            { _id: regex },
          ]
        };
      }

      const people = await masterListCollection
        .find(query)
        .project({ _id: 1, firstName: 1, lastName: 1, grade: 1 })
        .limit(20)
        .toArray();
      // Normalize: expose email as top-level field (stored as _id)
      people.forEach(p => { p.email = p._id; });
      return res.status(200).json({ people });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST — bulk-upsert master list entries (admin only)
  if (req.method === 'POST') {
    try {
      try {
        await authenticateAdmin(req);
      } catch (err) {
        return res.status(401).json({ error: err.message });
      }

      const { people } = req.body;
      if (!people || !Array.isArray(people)) {
        return res.status(400).json({ error: 'Invalid people array payload.' });
      }

      const operations = people.map(person => ({
        updateOne: {
          filter: { _id: person.email },
          update: { $set: { ...person, _id: person.email } },
          upsert: true,
        },
      }));

      await masterListCollection.bulkWrite(operations);

      return res.status(200).json({
        success: true,
        message: `Imported ${people.length} people into master list.`,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
