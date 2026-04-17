import { getDb } from './lib/db.js';
import { authenticateRequest, authenticateAdmin } from './lib/verifyAuth.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const db = await getDb();
  // Query both collection names — the collection was renamed mid-session so
  // submissions may exist in either 'pending_eliminations' or 'eliminations'.
  const col = db.collection('eliminations');
  const legacyCol = db.collection('pending_eliminations');

  // ── GET ─────────────────────────────────────────────────────────────────────
  // Admin: returns all pending eliminations.
  // Player: returns their full history.
  if (req.method === 'GET') {
    let decodedToken;
    try {
      decodedToken = await authenticateRequest(req);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
    const isAdmin = adminEmails.includes(decodedToken.email);
    const wantsMine = req.query.mine === 'true';

    // Admin queue view — only when not explicitly requesting personal history
    if (isAdmin && !wantsMine) {
      const [current, legacy] = await Promise.all([
        col.find({ status: 'pending' }).sort({ timestamp: -1 }).toArray(),
        legacyCol.find({ status: 'pending' }).sort({ timestamp: -1 }).toArray(),
      ]);
      const eliminations = [...current, ...legacy].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
      return res.status(200).json({ eliminations });
    }

    // Personal history (players always; admins when ?mine=true)
    const [current, legacy] = await Promise.all([
      col.find({ killerEmail: decodedToken.email }).sort({ timestamp: -1 }).toArray(),
      legacyCol.find({ killerEmail: decodedToken.email }).sort({ timestamp: -1 }).toArray(),
    ]);
    const history = [...current, ...legacy].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    return res.status(200).json({ history });
  }

  // ── POST ─────────────────────────────────────────────────────────────────────
  // Player reports an elimination. Creates a pending record — nothing is
  // committed to the game state until an admin approves it.
  if (req.method === 'POST') {
    let decodedToken;
    try {
      decodedToken = await authenticateRequest(req);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    const { killerEmail, killerName, victimEmail, victimName } = req.body;

    if (!killerEmail || !victimEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (killerEmail !== decodedToken.email) {
      return res.status(403).json({ error: 'You can only report your own eliminations.' });
    }

    // Prevent duplicate pending submissions
    const existing = await col.findOne({ killerEmail, status: 'pending' });
    if (existing) {
      return res.status(409).json({ error: 'You already have an elimination pending admin review.' });
    }

    await col.insertOne({
      killerEmail,
      killerName,
      victimEmail,
      victimName,
      timestamp: new Date().toISOString(),
      status: 'pending',
    });

    return res.status(201).json({ success: true });
  }

  // ── PATCH ─────────────────────────────────────────────────────────────────────
  // Admin approves or rejects a pending elimination.
  // On approve: runs the full kill transaction atomically.
  // On reject: simply removes the pending record.
  if (req.method === 'PATCH') {
    try {
      await authenticateAdmin(req);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    const { id, action } = req.body;
    if (!id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Provide id and action ("approve" or "reject")' });
    }

    let elimination;
    try {
      elimination = await col.findOne({ _id: new ObjectId(id) });
    } catch {
      return res.status(400).json({ error: 'Invalid id format' });
    }
    if (!elimination) {
      return res.status(404).json({ error: 'Pending elimination not found' });
    }

    if (action === 'reject') {
      await col.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: 'rejected', decidedAt: new Date().toISOString() } }
      );
      return res.status(200).json({ success: true, action: 'rejected' });
    }

    // ── APPROVE: atomically apply the kill ───────────────────────────────────
    // The eliminations document becomes the single source of truth (ledger=true).
    // No separate kill_events write; no newTarget* fields stored.
    const session = db.client.startSession();
    try {
      await session.withTransaction(async () => {
        const victim = await db.collection('users').findOne(
          { _id: elimination.victimEmail },
          { session }
        );
        if (!victim) throw new Error('Victim user not found in database');

        const newTargetEmail = victim.targetEmail;

        // Mark victim dead and remove their target
        await db.collection('users').updateOne(
          { _id: elimination.victimEmail },
          { $set: { status: 'dead', targetEmail: null } },
          { session }
        );

        // Give killer their victim's next target
        await db.collection('users').updateOne(
          { _id: elimination.killerEmail },
          { $set: { targetEmail: newTargetEmail } },
          { session }
        );

        // Mark the elimination approved; ledger:true flags it for public display
        await col.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: 'approved', ledger: true, decidedAt: new Date().toISOString() } },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    return res.status(200).json({ success: true, action: 'approved' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
