const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config();

// User schema (simplified)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  accountStatus: { type: String, default: 'active' },
  emailVerified: { type: Boolean, default: true },
  permissions: [String],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createAdminManually() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        
        const connectionString = process.env.MONGODB_URI;
        if (!connectionString) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        await mongoose.connect(connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ Connected to MongoDB');

        // Check existing collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📊 Existing collections:', collections.map(c => c.name));

        // Check if admin user already exists
        const existingAdmin = await User.findOne({ 
            $or: [
                { email: 'admin@erotc.org' },
                { username: 'admin' }
            ]
        });

        if (existingAdmin) {
            console.log('👤 Admin user already exists:', existingAdmin.username);
            console.log('   Name:', existingAdmin.name);
            console.log('   Email:', existingAdmin.email);
            console.log('   Role:', existingAdmin.role);
            console.log('   Active:', existingAdmin.isActive);
            
            // Test password
            const isValidPassword = await bcrypt.compare('admin123', existingAdmin.password);
            console.log('   Password valid:', isValidPassword);
            
            if (!isValidPassword) {
                console.log('🔄 Updating admin password...');
                const hashedPassword = await bcrypt.hash('admin123', 12);
                await User.findByIdAndUpdate(existingAdmin._id, { password: hashedPassword });
                console.log('✅ Admin password updated');
            }
        } else {
            console.log('👤 Creating new admin user...');
            
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            const admin = new User({
                name: 'Admin User',
                email: 'admin@erotc.org',
                username: 'admin',
                password: hashedPassword,
                role: 'super-admin',
                isActive: true,
                accountStatus: 'active',
                emailVerified: true,
                permissions: ['read', 'write', 'delete', 'manage-users', 'super-admin']
            });

            await admin.save();
            console.log('✅ Admin user created successfully');
        }

        // List all users
        const allUsers = await User.find({}).select('-password');
        console.log('\n👥 All users in database:');
        allUsers.forEach(user => {
            console.log(`   - ${user.username} (${user.name}) - ${user.role} - ${user.isActive ? 'Active' : 'Inactive'}`);
        });

        await mongoose.connection.close();
        console.log('\n🎉 Admin setup complete!');
        console.log('   Username: admin');
        console.log('   Password: admin123');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
    }
}

createAdminManually();