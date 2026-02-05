const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import the User model
const User = require('./models/Users');

async function createRealAdmin() {
    try {
        console.log('🔗 Connecting to Azure Cosmos DB...');
        console.log('📍 Connection string:', process.env.MONGODB_URI ? 'Found' : 'Missing');
        
        // Connect with explicit database name
        await mongoose.connect(process.env.MONGODB_URI, {
            // This is the most important line to stop the "test" DB
            dbName: 'church_db',
            // Azure Cosmos DB specific settings
            useNewUrlParser: true,
            useUnifiedTopology: true,
            retryWrites: false, // Recommended for Azure Cosmos MongoDB
            maxPoolSize: 1, // Minimize connections for low throughput
            serverSelectionTimeoutMS: 10000
        });
        
        console.log('✅ Connected to Azure Cosmos DB');
        
        // Check if admin already exists
        const existingAdmin = await User.findOne({ 
            $or: [
                { email: 'admin@stmichael.church' },
                { username: 'admin' }
            ]
        });
        
        if (existingAdmin) {
            console.log('👤 Admin user already exists:', existingAdmin.username);
            console.log('📧 Email:', existingAdmin.email);
            console.log('🔑 Role:', existingAdmin.role);
            console.log('✅ Active:', existingAdmin.isActive);
            
            // Update password to ensure it works
            const hashedPassword = await bcrypt.hash('admin123', 12);
            existingAdmin.password = hashedPassword;
            existingAdmin.isActive = true;
            existingAdmin.accountStatus = 'active';
            existingAdmin.emailVerified = true;
            existingAdmin.requiresEmailVerification = false;
            
            await existingAdmin.save();
            console.log('🔄 Admin password updated to: admin123');
            
        } else {
            console.log('➕ Creating new admin user...');
            
            // Hash password
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            // Create admin user
            const adminUser = new User({
                name: 'System Administrator',
                email: 'admin@stmichael.church',
                username: 'admin',
                password: hashedPassword,
                role: 'super-admin',
                isActive: true,
                accountStatus: 'active',
                emailVerified: true,
                requiresEmailVerification: false,
                permissions: ['read', 'write', 'delete', 'manage-users', 'super-admin'],
                createdAt: new Date(),
                lastLogin: new Date()
            });
            
            const savedUser = await adminUser.save();
            console.log('✅ Admin user created successfully!');
            console.log('👤 Username:', savedUser.username);
            console.log('📧 Email:', savedUser.email);
            console.log('🔑 Role:', savedUser.role);
        }
        
        console.log('\n🎯 Login Credentials:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('\n🌐 You can now login at: http://localhost:3001/admin');
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        
        if (error.message.includes('throughput')) {
            console.log('\n💡 Throughput Limit Solution:');
            console.log('   Your Azure Cosmos DB has reached its throughput limit (1000 RU/s)');
            console.log('   You can either:');
            console.log('   1. Increase throughput in Azure Portal (costs more)');
            console.log('   2. Use development bypass mode (what we were doing)');
            console.log('   3. Wait and try again later');
        }
        
        if (error.message.includes('index')) {
            console.log('\n💡 Index Error Solution:');
            console.log('   The database needs proper indexing setup');
            console.log('   This is an Azure Cosmos DB configuration issue');
        }
        
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from database');
    }
}

// Run the script
createRealAdmin();