const mongoose = require('mongoose');
require('dotenv').config();

// Import all models to ensure they're registered
const User = require('./models/Users');
const Member = require('./models/Member');
const Transaction = require('./models/Transaction');
const InventoryItem = require('./models/InventoryItem');
const Task = require('./models/Task');
const Promise = require('./models/Promise');
const MemberContribution = require('./models/MemberContribution');
const Report = require('./models/Report');

async function createAllCollections() {
    try {
        console.log('🔗 Connecting to Azure Cosmos DB...');
        
        const connectionString = process.env.MONGODB_URI;
        
        // Connect with explicit database name
        await mongoose.connect(connectionString, {
            // This is the most important line to stop the "test" DB
            dbName: 'church_db',
            // Azure Cosmos DB specific settings
            useNewUrlParser: true,
            useUnifiedTopology: true,
            retryWrites: false, // Recommended for Azure Cosmos MongoDB
            maxPoolSize: 1, // Minimize connections for low throughput
            serverSelectionTimeoutMS: 10000
        });
        
        console.log("✅ Connected successfully to church_db database");
        
        // Get the database instance
        const db = mongoose.connection.db;
        console.log(`📍 Current database: ${db.databaseName}`);
        
        // List of collections to create with their purposes
        const collections = [
            { name: 'users', model: User, description: 'System users and administrators' },
            { name: 'members', model: Member, description: 'Church members database' },
            { name: 'transactions', model: Transaction, description: 'Financial transactions and accounting' },
            { name: 'inventoryitems', model: InventoryItem, description: 'Church inventory and assets' },
            { name: 'tasks', model: Task, description: 'Task management and assignments' },
            { name: 'promises', model: Promise, description: 'Member promises and commitments' },
            { name: 'membercontributions', model: MemberContribution, description: 'Member financial contributions' },
            { name: 'reports', model: Report, description: 'Generated reports and analytics' }
        ];
        
        console.log('\n📋 Creating collections in church_db...');
        
        for (const collection of collections) {
            try {
                console.log(`\n📁 Creating collection: ${collection.name}`);
                console.log(`   Purpose: ${collection.description}`);
                
                // Create collection using the model (this ensures indexes are created)
                await collection.model.createCollection();
                
                // Verify collection exists
                const collectionExists = await db.listCollections({ name: collection.name }).hasNext();
                
                if (collectionExists) {
                    console.log(`   ✅ Collection '${collection.name}' created successfully`);
                    
                    // Get collection stats
                    try {
                        const stats = await db.collection(collection.name).stats();
                        console.log(`   📊 Documents: ${stats.count || 0}`);
                    } catch (statsError) {
                        console.log(`   📊 Documents: 0 (new collection)`);
                    }
                } else {
                    console.log(`   ⚠️  Collection '${collection.name}' may not be visible yet`);
                }
                
            } catch (collectionError) {
                if (collectionError.message.includes('already exists')) {
                    console.log(`   ✅ Collection '${collection.name}' already exists`);
                } else {
                    console.log(`   ❌ Error creating '${collection.name}': ${collectionError.message}`);
                }
            }
        }
        
        // List all collections in the database
        console.log('\n📋 Final collection list in church_db:');
        const allCollections = await db.listCollections().toArray();
        
        if (allCollections.length > 0) {
            allCollections.forEach((col, index) => {
                console.log(`   ${index + 1}. ${col.name}`);
            });
        } else {
            console.log('   No collections found (they may be created on first document insert)');
        }
        
        console.log('\n🎯 Database Setup Complete!');
        console.log('✅ All necessary collections have been initialized');
        console.log('📍 Database: church_db');
        console.log('🔗 Connection: Azure Cosmos DB');
        
        // Test a simple operation
        console.log('\n🧪 Testing database operations...');
        try {
            const userCount = await User.countDocuments();
            console.log(`👤 Users in database: ${userCount}`);
            
            const memberCount = await Member.countDocuments();
            console.log(`👥 Members in database: ${memberCount}`);
            
            console.log('✅ Database operations working correctly');
        } catch (testError) {
            console.log(`⚠️  Database test warning: ${testError.message}`);
        }
        
    } catch (error) {
        console.error('❌ Error setting up collections:', error);
        
        if (error.message.includes('throughput')) {
            console.log('\n💡 Throughput Limit Solution:');
            console.log('   Your Azure Cosmos DB has reached its throughput limit (1000 RU/s)');
            console.log('   Collections will be created when first documents are inserted');
        }
        
        if (error.message.includes('timeout')) {
            console.log('\n💡 Connection Timeout:');
            console.log('   Try running the script again - Azure Cosmos DB can be slow to respond');
        }
        
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from database');
    }
}

// Run the script
createAllCollections();