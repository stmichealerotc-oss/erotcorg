const { MongoClient } = require('mongodb');

async function migrate() {
    const client = new MongoClient(process.env.COSMOS_CONNECTION_STRING);
    try {
        await client.connect();
        const adminDb = client.db('admin');

        // 1. Create the shared database (if it doesn't exist)
        // This command is specific to Azure Cosmos DB for MongoDB
        await adminDb.command({
            customAction: "CreateDatabase",
            offerThroughput: 400 // Set this to 1000 to max out the Free Tier
        });
        console.log("Shared database 'church_db' created/verified.");

        // 2. Define your collections
        const collections = ['members', 'transactions', 'inventory', 'tasks', 'users', 'reports'];
        const db = client.db('church_db');

        for (const colName of collections) {
            // Create collection if it doesn't exist
            // Important: Shared containers must have a shard key in Cosmos DB
            await db.createCollection(colName);
            
            // 3. Shard the collection to enable high-scale (required for shared throughput)
            await adminDb.command({
                shardCollection: `church_db.${colName}`,
                key: { _id: "hashed" } // You can use "hashed" for standard performance
            });
            console.log(`Collection '${colName}' initialized and shared.`);
        }

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.close();
    }
}

migrate();
