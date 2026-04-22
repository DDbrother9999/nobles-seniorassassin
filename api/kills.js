import { getDb } from './lib/db.js';
import { authenticateRequest, authenticateAdmin } from './lib/verifyAuth.js';

// Fields we never expose publicly — internal routing info only.
const STRIP_FIELDS = ['newTargetEmail', 'newTargetName'];

function stripFields(doc) {
  const out = { ...doc };
  for (const f of STRIP_FIELDS) delete out[f];
  return out;
}

export default async function handler(req, res) {
  const db = await getDb();

  // ── GET ─────────────────────────────────────────────────────────────────────
  // Returns the public kill ledger.
  // Source of truth: eliminations where ledger:true (approved via admin queue).
  // Legacy fallback: kill_events collection (pre-consolidation records).
  if (req.method === 'GET') {
    try {
      const settings = await db.collection('settings').findOne({ _id: 'game' });
      if (!settings || !settings.isLedgerPublic) {
        try {
          await authenticateAdmin(req);
        } catch (err) {
          return res.status(403).json({ error: 'Ledger is private' });
        }
        res.setHeader('Cache-Control', 'private, max-age=15');
      } else {
        res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30');
      }

      const projection = {
        _id: 1,
        killerName: 1,
        victimName: 1,
        timestamp: 1,
        decidedAt: 1,
        approvedAt: 1
      };

      const [fromEliminations, fromLegacy, leaderboardDoc] = await Promise.all([
        db.collection('eliminations')
          .find({ ledger: true })
          .project(projection)
          .sort({ decidedAt: -1 })
          .toArray(),
        db.collection('kill_events')
          .find({})
          .project(projection)
          .sort({ timestamp: -1 })
          .toArray(),
        db.collection('settings').findOne({ _id: 'leaderboard' })
      ]);
      
      const leaderboard = leaderboardDoc ? leaderboardDoc.top5 || [] : [];

      // Merge, deduplicate by _id string, newest first, strip internal fields.
      const seen = new Set();
      const kills = [...fromEliminations, ...fromLegacy]
        .filter(doc => {
          const key = String(doc._id);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => {
          const ta = new Date(a.decidedAt || a.approvedAt || a.timestamp);
          const tb = new Date(b.decidedAt || b.approvedAt || b.timestamp);
          return tb - ta;
        })
        .map(stripFields);

      return res.status(200).json({ kills, leaderboard });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── POST ─────────────────────────────────────────────────────────────────────
  // Legacy direct-kill endpoint (kept for compatibility).
  // New flow: use /api/eliminations (pending → admin approval → ledger).
  if (req.method === 'POST') {
    return res.status(405).json({ error: 'Endpoint deprecated. Use /api/eliminations.' });
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
          if (!victim) throw new Error('Victim not found');

          const newTargetEmail = victim.targetEmail;

          // Write to legacy kill_events without any newTarget* metadata
          if (killEvent) {
            const cleanEvent = { ...killEvent };
            delete cleanEvent.newTargetEmail;
            delete cleanEvent.newTargetName;
            await db.collection('kill_events').insertOne(cleanEvent, { session });
          }

          await db.collection('users').updateOne(
            { _id: targetId },
            { $set: { status: 'dead', targetEmail: null } },
            { session }
          );
          await db.collection('users').updateOne(
            { _id: userId },
            { $set: { targetEmail: newTargetEmail } },
            { session }
          );
        });
      } finally {
        await session.endSession();
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── DELETE ───────────────────────────────────────────────────────────────────
  // Admin-only: total reset — wipes kill_events (legacy) AND the entire
  // eliminations collection (pending, approved, rejected history).
  if (req.method === 'DELETE') {
    try {
      try {
        await authenticateAdmin(req);
      } catch (err) {
        return res.status(401).json({ error: err.message });
      }

      const [killsResult, eliminationsResult] = await Promise.all([
        db.collection('kill_events').deleteMany({}),
        db.collection('eliminations').deleteMany({}),
      ]);

      const total = killsResult.deletedCount + eliminationsResult.deletedCount;
      return res.status(200).json({ success: true, count: total });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
