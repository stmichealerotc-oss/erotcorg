#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🏗️ Building St. Michael Church Management System...');

// Ensure directories exist
const frontendAdmin = path.join(__dirname, 'frontend-admin');
const frontendWebsite = path.join(__dirname, 'frontend-website');

if (!fs.existsSync(frontendAdmin)) {
    console.error('❌ frontend-admin directory not found');
    process.exit(1);
}

if (!fs.existsSync(frontendWebsite)) {
    console.log('⚠️ frontend-website directory not found, creating placeholder...');
    fs.mkdirSync(frontendWebsite, { recursive: true });
    
    // Create a simple index.html for the public website
    const websiteIndex = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>St. Michael Church</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { color: #2c3e50; }
        .admin-link { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to St. Michael Church</h1>
        <p>Church Management System</p>
        <a href="/admin" class="admin-link">Admin Panel</a>
    </div>
</body>
</html>`;
    
    fs.writeFileSync(path.join(frontendWebsite, 'index.html'), websiteIndex);
    console.log('✅ Created placeholder website');
}

// Verify admin panel files
const adminIndex = path.join(frontendAdmin, 'index.html');
if (!fs.existsSync(adminIndex)) {
    console.error('❌ frontend-admin/index.html not found');
    process.exit(1);
}

console.log('✅ Build completed successfully!');
console.log('📁 Structure:');
console.log('   - frontend-admin/ (Church Management Admin Panel)');
console.log('   - frontend-website/ (Public Church Website)');
console.log('   - backend/ (API Server - deployed separately)');