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

// Connect to LOCAL MongoDB
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/church_db'; // Update if different

async function exportData() {
  try {
    console.log('🔗 Connecting to LOCAL MongoDB...');
    await mongoose.connect(LOCAL_MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to LOCAL MongoDB');

    const exportDir = path.join(__dirname, 'data-export');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }

    // Export each collection
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
      console.log(`\n📦 Exporting ${collection.name}...`);
      const data = await collection.model.find({}).lean();
      
      const filePath = path.join(exportDir, `${collection.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      console.log(`✅ Exported ${data.length} documents to ${collection.name}.json`);
    }

    console.log('\n✅ All data exported successfully!');
    console.log(`📁 Data saved in: ${exportDir}`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

exportData();
