// One-time script to create admin user in Azure Cosmos DB
// Run this once after deployment: node create-admin-azure.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Simple User schema (inline to avoid import issues)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    permissions: [String],
    isActive: { type: Boolean, default: true },
    accountStatus: { type: String, default: 'active' },
    isFirstLogin: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: true },
    requiresEmailVerification: { type: Boolean, default: false },
    lastLogin: Date,
    lastActivityTime: Date,
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createAdmin() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        console.log('📍 URI:', process.env.MONGODB_URI ? 'Found' : 'Missing');
        
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Check if admin already exists
        const existingAdmin = await User.findOne({ username: 'admin' });
        
        if (existingAdmin) {
            console.log('⚠️  Admin user already exists!');
            console.log('📧 Email:', existingAdmin.email);
            console.log('👤 Username:', existingAdmin.username);
            console.log('🔑 Role:', existingAdmin.role);
            await mongoose.disconnect();
            return;
        }
        
        console.log('🔄 Creating admin user...');
        
        // Hash password
        const hashedPassword = await bcrypt.hash('admin123', 12);
        
        // Create admin user
        const admin = new User({
            username: 'admin',
            password: hashedPassword,
            role: 'super-admin',
            name: 'System Administrator',
            email: 'stmichealerotc@gmail.com',
            permissions: ['all'],
            isActive: true,
            accountStatus: 'active',
            isFirstLogin: false,
            emailVerified: true,
            requiresEmailVerification: false,
            lastLogin: new Date(),
            lastActivityTime: new Date()
        });
        
        await admin.save();
        
        console.log('✅ Admin user created successfully!');
        console.log('');
        console.log('═══════════════════════════════════════');
        console.log('📋 LOGIN CREDENTIALS:');
        console.log('═══════════════════════════════════════');
        console.log('👤 Username: admin');
        console.log('🔑 Password: admin123');
        console.log('📧 Email: stmichealerotc@gmail.com');
        console.log('🎭 Role: super-admin');
        console.log('═══════════════════════════════════════');
        console.log('');
        console.log('⚠️  IMPORTANT: Change the password after first login!');
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        console.error('Error details:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

createAdmin();
