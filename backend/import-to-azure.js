require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import all models
const Users = require('./models/Users');
const Member = require('./models/Member');
const Transaction = require('./models/Transaction');
const InventoryItem = require('./models/InventoryItem');
const Task = require('./models/Task');
const Promise = require('./models/Promise');
const MemberContribution = require('./models/MemberContribution');
const Report = require('./models/Report');

// Use Azure Cosmos DB connection from .env
const AZURE_MONGODB_URI = process.env.MONGODB_URI;

async function importData() {
  try {
    console.log('🔗 Connecting to AZURE Cosmos DB...');
    await mongoose.connect(AZURE_MONGODB_URI, {
      dbName: 'church_db',
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: false
    });
    console.log('✅ Connected to AZURE Cosmos DB');

    const exportDir = path.join(__dirname, 'data-export');
    
    if (!fs.existsSync(exportDir)) {
      console.error('❌ Export directory not found. Run export-local-data.js first!');
      process.exit(1);
    }

    // Import each collection
    const collections = [
      { name: 'users', model: Users },
      { name: 'members', model: Member },
      { name: 'transactions', model: Transaction },
      { name: 'inventoryitems', model: InventoryItem },
      { name: 'tasks', model: Task },
      { name: 'promises', model: Promise },
      { name: 'membercontributions', model: MemberContribution },
      { name: 'reports', model: Report }
    ];

    for (const collection of collections) {
      const filePath = path.join(exportDir, `${collection.name}.json`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${collection.name} - file not found`);
        continue;
      }

      console.log(`\n📦 Importing ${collection.name}...`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (data.length === 0) {
        console.log(`⚠️  No data to import for ${collection.name}`);
        continue;
      }

      // Check if data already exists
      const existingCount = await collection.model.countDocuments();
      if (existingCount > 0) {
        console.log(`⚠️  ${collection.name} already has ${existingCount} documents`);
        console.log(`   Skipping to avoid duplicates. Delete collection first if you want to reimport.`);
        continue;
      }

      // Import data
      await collection.model.insertMany(data);
      console.log(`✅ Imported ${data.length} documents to ${collection.name}`);
    }

    console.log('\n✅ All data imported successfully!');
    
    // Show summary
    console.log('\n📊 Database Summary:');
    for (const collection of collections) {
      const count = await collection.model.countDocuments();
      console.log(`   ${collection.name}: ${count} documents`);
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importData();
