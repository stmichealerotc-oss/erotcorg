const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config();

async function testDirectConnection() {
    let client;
    try {
        console.log('🔗 Testing direct MongoDB connection...');
        
        const connectionString = process.env.MONGODB_URI;
        if (!connectionString) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        console.log('Connection string database:', connectionString.split('/')[3]?.split('?')[0]);

        client = new MongoClient(connectionString);
        await client.connect();
        
        console.log('✅ Connected to MongoDB');

        const db = client.db();
        console.log('📊 Database name:', db.databaseName);

        // List all collections
        const collections = await db.listCollections().toArray();
        console.log('📊 Existing collections:', collections.map(c => c.name));

        // If there are existing collections, let's try to use one for users
        if (collections.length > 0) {
            console.log('\n🔍 Checking existing collections for user data...');
            
            for (const collection of collections) {
                const coll = db.collection(collection.name);
                const count = await coll.countDocuments();
                console.log(`   ${collection.name}: ${count} documents`);
                
                // Check if this collection has user-like documents
                if (count > 0) {
                    const sample = await coll.findOne();
                    if (sample && (sample.username || sample.email || sample.role)) {
                        console.log(`   📋 ${collection.name} appears to contain user data:`, Object.keys(sample));
                    }
                }
            }
        }

        // Try to create or use a 'shared' collection for users
        console.log('\n👤 Attempting to create admin user in shared collection...');
        
        const usersCollection = db.collection('shared'); // Use shared collection
        
        // Check if admin already exists
        const existingAdmin = await usersCollection.findOne({ 
            $or: [
                { email: 'admin@erotc.org' },
                { username: 'admin' }
            ]
        });

        if (existingAdmin) {
            console.log('✅ Admin user found in shared collection:', existingAdmin.username);
        } else {
            console.log('👤 Creating admin user in shared collection...');
            
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            const adminUser = {
                _type: 'user', // Add type field to distinguish in shared collection
                name: 'Admin User',
                email: 'admin@erotc.org',
                username: 'admin',
                password: hashedPassword,
                role: 'super-admin',
                isActive: true,
                accountStatus: 'active',
                emailVerified: true,
                permissions: ['read', 'write', 'delete', 'manage-users', 'super-admin'],
                createdAt: new Date()
            };

            const result = await usersCollection.insertOne(adminUser);
            console.log('✅ Admin user created with ID:', result.insertedId);
        }

        // List all users in shared collection
        const allUsers = await usersCollection.find({ _type: 'user' }).toArray();
        console.log('\n👥 All users in shared collection:');
        allUsers.forEach(user => {
            console.log(`   - ${user.username} (${user.name}) - ${user.role} - ${user.isActive ? 'Active' : 'Inactive'}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

testDirectConnection();