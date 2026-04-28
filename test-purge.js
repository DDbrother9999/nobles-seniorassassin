const { MongoClient } = require('mongodb');

function runPurgeSimulation(aliveUsers, killersSet) {
  const purgedUsers = new Set();
  const userMap = new Map();

  aliveUsers.forEach(u => {
    userMap.set(u._id, u);
    if (!killersSet.has(u._id)) {
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

  return ops;
}

// Suppose 5 users: A -> B -> C -> D -> E -> A
// A has kill. B no kill. C no kill. D has kill. E no kill.
// Killers: A, D
// Expected purged: B, C, E
// A's target should become D (skips B, C)
// D's target should become A (skips E)
const aliveUsers = [
  { _id: 'A', status: 'alive', targetEmail: 'B' },
  { _id: 'B', status: 'alive', targetEmail: 'C' },
  { _id: 'C', status: 'alive', targetEmail: 'D' },
  { _id: 'D', status: 'alive', targetEmail: 'E' },
  { _id: 'E', status: 'alive', targetEmail: 'A' }
];

const killersSet = new Set(['A', 'D']);

const ops = runPurgeSimulation(aliveUsers, killersSet);
console.log(JSON.stringify(ops, null, 2));

// Test 2: Dead users in the loop
// Let's say B is ALREADY dead. The db query `const aliveUsers = await users.find({ status: 'alive' }).toArray();`
// skips B. So alive users: A, C, D, E
// Wait, if B is already dead, B should NOT be in the aliveUsers array!
// But wait... if B is dead, and A's target is B? That shouldn't happen during a game loop unless someone died and targets weren't updated correctly. But if someone died due to a kill, A's target would have been updated to C.
