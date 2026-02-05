// Script to delete the old Q3 FY2025-2026 report so a fresh one can be generated
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Report = require('../models/Report');

async function deleteOldReport() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Delete the Q3 FY2025-2026 report
        const result = await Report.deleteOne({
            type: 'quarterly',
            financialYear: '2025-2026',
            quarter: 3
        });

        console.log(`📊 Deleted ${result.deletedCount} report(s)`);
        
        if (result.deletedCount > 0) {
            console.log('✅ Old report deleted successfully!');
            console.log('Now generate a new report and it will have the updated structure.');
        } else {
            console.log('ℹ️ No matching report found to delete.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

deleteOldReport();
