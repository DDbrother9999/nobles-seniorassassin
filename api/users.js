import { getDb } from './lib/db.js';
import { authenticateRequest, authenticateAdmin } from './lib/verifyAuth.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const db = await getDb();
  const users = db.collection('users');
  const { action } = req.query;

  // ── POST /api/users?action=auth ──────────────────────────────────────────────
  // Verifies Firebase token, returns user profile + target info.
  if (req.method === 'POST' && action === 'auth') {
    let email;
    try {
      const decoded = await authenticateRequest(req);
      email = decoded.email || decoded.uid;
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    if (!email) return res.status(400).json({ error: 'Email is missing from verified token' });

    try {
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
      const isAdmin = adminEmails.includes(email);

      let user = await users.findOne({ _id: email });

      if (!user && !isAdmin) {
        return res.status(403).json({ error: 'Access Denied: You are not on the official roster.' });
      }
      if (!user && isAdmin) {
        user = { _id: email, firstName: 'Admin', lastName: 'Account', status: 'alive', targetEmail: null };
      }

      user.email = user._id;
      if (isAdmin) user.isAdmin = true;

      if (user.targetEmail) {
        const target = await users.findOne({ _id: user.targetEmail });
        if (target) {
          user.targetProfile = { firstName: target.firstName, lastName: target.lastName, studentId: target.studentId };
        }
      }

      return res.status(200).json({ user });
    } catch (error) {
      console.error('Auth Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // ── POST /api/users?action=randomize ─────────────────────────────────────────
  // Admin: shuffles alive players and assigns circular target chain.
  if (req.method === 'POST' && action === 'randomize') {
    try {
      await authenticateAdmin(req);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    try {
      const alive = await users.find({ status: 'alive' }).toArray();
      if (alive.length < 2) {
        return res.status(400).json({ error: 'Not enough alive players to assign targets.' });
      }

      const shuffled = [...alive];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const ops = shuffled.map((u, i) => ({
        updateOne: {
          filter: { _id: u._id },
          update: { $set: { targetEmail: shuffled[(i + 1) % shuffled.length]._id } },
        },
      }));

      await users.bulkWrite(ops);
      return res.status(200).json({ success: true, count: shuffled.length });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── POST /api/users?action=revive ────────────────────────────────────────────
  // Admin: marks all players as alive.
  if (req.method === 'POST' && action === 'revive') {
    try {
      await authenticateAdmin(req);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    try {
      const result = await users.updateMany({}, { $set: { status: 'alive' } });
      return res.status(200).json({ success: true, count: result.modifiedCount });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── GET /api/users ───────────────────────────────────────────────────────────
  // All authenticated users: full roster. Target email hidden from non-admins.
  if (req.method === 'GET') {
    let decoded;
    try {
      decoded = await authenticateRequest(req);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    try {
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
      const isAdmin = adminEmails.includes(decoded.email);

      const list = await users.find({}).toArray();
      list.forEach(u => {
        u.email = u._id;
        if (!isAdmin) delete u.targetEmail;
      });
      return res.status(200).json({ users: list });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── POST /api/users ──────────────────────────────────────────────────────────
  // Admin: bulk-upsert roster.
  if (req.method === 'POST') {
    try {
      await authenticateAdmin(req);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    try {
      const { users: payload } = req.body;
      if (!payload || !Array.isArray(payload)) {
        return res.status(400).json({ error: 'Invalid users array payload.' });
      }

      const ops = payload.map(u => ({
        updateOne: {
          filter: { _id: u.email },
          update: { $set: { ...u, _id: u.email } },
          upsert: true,
        },
      }));

      await users.bulkWrite(ops);
      return res.status(200).json({ success: true, message: `Imported ${payload.length} users.` });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── PUT /api/users ───────────────────────────────────────────────────────────
  // Admin: update arbitrary fields on a single player (e.g. manual target override).
  if (req.method === 'PUT') {
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
      await users.updateOne({ _id: userId }, { $set: updates });
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── DELETE /api/users ────────────────────────────────────────────────────────
  // Admin: ?email=...  → removes a single player.
  //        (no param)  → removes ALL players from the roster.
  if (req.method === 'DELETE') {
    try {
      await authenticateAdmin(req);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    try {
      const { email } = req.query;

      if (email) {
        const result = await users.deleteOne({ _id: email });
        if (result.deletedCount === 0) return res.status(404).json({ error: 'Player not found.' });
        return res.status(200).json({ success: true, message: `Removed player ${email}.` });
      }

      // No email — wipe the entire roster.
      const result = await users.deleteMany({});
      return res.status(200).json({ success: true, count: result.deletedCount });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
