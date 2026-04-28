const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://ddbrother:LzgSPjXxHwtSvrDG@cluster0.cycr5dz.mongodb.net/?appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('seniorassassin');
    const usersBackup = await db.collection('users_backup').find({}).toArray();
    const usersLive = await db.collection('users').find({}).toArray();
    
    // Check if the purge already happened
    const liveAlive = usersLive.filter(u => u.status === 'alive').length;
    const backupAlive = usersBackup.filter(u => u.status === 'alive').length;
    
    console.log(`Live alive: ${liveAlive}, Backup alive: ${backupAlive}`);
    
    // Output a small sample of the loop from the backup
    const aliveBackup = usersBackup.filter(u => u.status === 'alive');
    const backupMap = new Map();
    aliveBackup.forEach(u => backupMap.set(u._id, u));
    
    let current = aliveBackup[0];
    let count = 0;
    const chain = [];
    while (current && count < 10) {
      chain.push(`${current.firstName} ${current.lastName} (${current._id}) -> targets -> ${current.targetEmail}`);
      current = backupMap.get(current.targetEmail);
      count++;
    }
    console.log("Sample chain from Backup:");
    console.log(chain.join('\n'));
    
    // Now output a small sample of the loop from the live database
    const aliveLive = usersLive.filter(u => u.status === 'alive');
    const liveMap = new Map();
    aliveLive.forEach(u => liveMap.set(u._id, u));
    
    let currentLive = aliveLive[0];
    let countLive = 0;
    const chainLive = [];
    while (currentLive && countLive < 10) {
      chainLive.push(`${currentLive.firstName} ${currentLive.lastName} (${currentLive._id}) -> targets -> ${currentLive.targetEmail}`);
      currentLive = liveMap.get(currentLive.targetEmail);
      countLive++;
    }
    console.log("\nSample chain from Live:");
    console.log(chainLive.join('\n'));

  } finally {
    await client.close();
  }
}

run().catch(console.dir);
