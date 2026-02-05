// backend/scripts/seedUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/Users'); // Make sure this path is correct


const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        const users = [
            {
                username: 'admin',
                password: await bcrypt.hash('admin123', 10),
                role: 'super-admin',
                name: 'System Administrator',
                email: 'stmichealerotc@gmail.com', // Real church email
                permissions: ['all'],
                isActive: true,
                accountStatus: 'active',
                isFirstLogin: false
            },
            {
                username: 'chairperson',
                password: await bcrypt.hash('chair123', 10),
                role: 'chairperson',
                name: 'Committee Chairperson',
                email: 'debesay304@gmail.com', // Real email
                permissions: ['members', 'reports', 'tasks'],
                isActive: true,
                accountStatus: 'active',
                isFirstLogin: false
            },
            {
                username: 'secretary',
                password: await bcrypt.hash('secretary123', 10),
                role: 'secretary',
                name: 'Committee Secretary',
                email: 'secretary@stmichealerotc.org', // Church domain email
                permissions: ['members', 'reports', 'tasks'],
                isActive: true,
                accountStatus: 'pending',
                isFirstLogin: true
            },
            {
                username: 'accountant',
                password: await bcrypt.hash('accountant123', 10),
                role: 'accountant',
                name: 'Church Accountant',
                email: 'accountant@stmichealerotc.org', // Church domain email
                permissions: ['accounting', 'reports', 'inventory'],
                isActive: true,
                accountStatus: 'pending',
                isFirstLogin: true
            },
            {
                username: 'holder',
                password: await bcrypt.hash('holder123', 10),
                role: 'holder-of-goods',
                name: 'Holder of Goods',
                email: 'holder@stmichealerotc.org', // Church domain email
                permissions: ['inventory'],
                isActive: true,
                accountStatus: 'pending',
                isFirstLogin: true
            },
            {
                username: 'coordinator',
                password: await bcrypt.hash('coord123', 10),
                role: 'community-coordinator',
                name: 'Community Coordinator',
                email: 'coordinator@stmichealerotc.org', // Church domain email
                permissions: ['members', 'tasks'],
                isActive: true,
                accountStatus: 'pending',
                isFirstLogin: true
            }
        ];

        await User.deleteMany({});
        const createdUsers = await User.insertMany(users);
        console.log(`✅ Created ${createdUsers.length} users:`);
        
        createdUsers.forEach(user => {
            console.log(`- ${user.username} (${user.role}): ${user.name}`);
        });

        console.log('\n🔐 Login credentials:');
        console.log('Username: admin, Password: admin123 (Super Admin)');
        console.log('Username: chairperson, Password: chair123 (Chairperson)');
        console.log('Username: secretary, Password: secretary123 (Secretary)');
        console.log('Username: accountant, Password: accountant123 (Accountant)');
        console.log('Username: holder, Password: holder123 (Holder of Goods)');
        console.log('Username: coordinator, Password: coord123 (Community Coordinator)');
    } catch (err) {
        console.error('❌ Error seeding users:', err);
    } finally {
        mongoose.disconnect();
    }
};

seedUsers();
