import { getDb } from './lib/db.js';
import { authenticateRequest, authenticateAdmin } from './lib/verifyAuth.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const db = await getDb();
  const users = db.collection('users');
  const eliminations = db.collection('eliminations');
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

      const pipeline = [
        { $match: { _id: email } },
        { 
          $lookup: {
            from: "users",
            localField: "targetEmail",
            foreignField: "_id",
            as: "targetData"
          }
        },
        { $unwind: { path: "$targetData", preserveNullAndEmptyArrays: true } },
        { 
          $project: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            status: 1,
            targetEmail: 1,
            grade: 1,
            studentId: 1,
            targetProfile: {
              $cond: {
                if: { $ne: ["$targetData", null] },
                then: {
                  firstName: "$targetData.firstName",
                  lastName: "$targetData.lastName",
                  studentId: "$targetData.studentId"
                },
                else: null
              }
            }
          }
        }
      ];

      const results = await users.aggregate(pipeline).toArray();
      let user = results[0];

      if (!user && !isAdmin) {
        return res.status(403).json({ error: 'Access Denied: You are not on the official roster.' });
      }
      if (!user && isAdmin) {
        user = { _id: email, firstName: 'Admin', lastName: 'Account', status: 'alive', targetEmail: null };
      }

      user.email = user._id;
      if (isAdmin) user.isAdmin = true;
      if (!user.targetProfile) delete user.targetProfile;

      // Include personal elimination history
      user.eliminationHistory = await eliminations.find({ killerEmail: email }).sort({ timestamp: -1 }).toArray();

      // Include pending queue for admins
      if (isAdmin) {
        user.pendingEliminations = await eliminations.find({ status: 'pending' }).sort({ timestamp: -1 }).toArray();
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
          update: { 
            $set: { targetEmail: shuffled[(i + 1) % shuffled.length]._id },
            $unset: { hasKillOverride: "" }
          },
        },
      }));

      await users.bulkWrite(ops);
      
      // Also update roundStartedAt in settings
      await db.collection('settings').updateOne(
        { _id: 'game' },
        { $set: { roundStartedAt: new Date().toISOString() } },
        { upsert: true }
      );

      return res.status(200).json({ success: true, count: shuffled.length });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── POST /api/users?action=unassign ──────────────────────────────────────────
  // Admin: clears all targetEmail fields.
  if (req.method === 'POST' && action === 'unassign') {
    try {
      await authenticateAdmin(req);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    try {
      const result = await users.updateMany({}, { $set: { targetEmail: null } });
      return res.status(200).json({ success: true, count: result.modifiedCount });
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

  // ── POST /api/users?action=purge ─────────────────────────────────────────────
  // Admin: sets status='dead' for all alive users who do not have an approved kill this round
  if (req.method === 'POST' && action === 'purge') {
    try {
      await authenticateAdmin(req);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    try {
      const settings = await db.collection('settings').findOne({ _id: 'game' });
      const roundStartedAt = settings?.roundStartedAt;
      
      let killersSet = new Set();
      if (roundStartedAt) {
        const approvedKills = await eliminations.find({
          status: 'approved',
          decidedAt: { $gte: roundStartedAt }
        }).toArray();
        approvedKills.forEach(k => killersSet.add(k.killerEmail));
      }

      const aliveUsers = await users.find({ status: 'alive' }).toArray();
      const purgedUsers = new Set();
      const userMap = new Map();

      aliveUsers.forEach(u => {
        userMap.set(u._id, u);
        let isSafe = killersSet.has(u._id);
        if (u.hasKillOverride !== undefined && u.hasKillOverride !== null) {
          isSafe = u.hasKillOverride;
        }

        if (isSafe) {
          killersSet.add(u._id);
        } else {
          killersSet.delete(u._id);
          purgedUsers.add(u._id);
        }
      });

      const ops = [];

      aliveUsers.forEach(u => {
        if (killersSet.has(u._id)) {
          let currentTarget = u.targetEmail;
          let visited = new Set();
          
          while (currentTarget && purgedUsers.has(currentTarget) && !visited.has(currentTarget)) {
            visited.add(currentTarget);
            const targetUser = userMap.get(currentTarget);
            if (targetUser) {
              currentTarget = targetUser.targetEmail;
            } else {
              break;
            }
          }
          
          if (currentTarget !== u.targetEmail) {
            ops.push({
              updateOne: {
                filter: { _id: u._id },
                update: { $set: { targetEmail: currentTarget } }
              }
            });
          }
        } else {
          ops.push({
            updateOne: {
              filter: { _id: u._id },
              update: { $set: { status: 'dead', targetEmail: null } }
            }
          });
        }
      });

      if (ops.length > 0) {
        await users.bulkWrite(ops);
      }

      return res.status(200).json({ success: true, count: purgedUsers.size });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── POST /api/users?action=backup ────────────────────────────────────────────
  // Admin: backups users collection to users_backup
  if (req.method === 'POST' && action === 'backup') {
    try {
      await authenticateAdmin(req);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    try {
      await users.aggregate([{ $match: {} }, { $out: 'users_backup' }]).toArray();
      const count = await users.countDocuments();
      return res.status(200).json({ success: true, count });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── GET /api/users ───────────────────────────────────────────────────────────
  // All authenticated users: full roster. Target email hidden from non-admins.
  if (req.method === 'GET') {
    try {
      await authenticateAdmin(req);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    try {
      const list = await users.find({}).toArray();
      
      const settings = await db.collection('settings').findOne({ _id: 'game' });
      const roundStartedAt = settings?.roundStartedAt;

      if (roundStartedAt) {
        const approvedKills = await db.collection('eliminations').find({
          status: 'approved',
          decidedAt: { $gte: roundStartedAt }
        }).toArray();

        const killersSet = new Set(approvedKills.map(k => k.killerEmail));
        list.forEach(u => {
          if (u.hasKillOverride !== undefined && u.hasKillOverride !== null) {
            u.hasKillThisRound = u.hasKillOverride;
          } else {
            u.hasKillThisRound = killersSet.has(u._id);
          }
        });
      } else {
        list.forEach(u => {
          if (u.hasKillOverride !== undefined && u.hasKillOverride !== null) {
            u.hasKillThisRound = u.hasKillOverride;
          }
        });
      }

      list.forEach(u => {
        u.email = u._id;
      });

      const pending = await eliminations.find({ status: 'pending' }).sort({ timestamp: -1 }).toArray();
      return res.status(200).json({ users: list, pendingEliminations: pending });
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
