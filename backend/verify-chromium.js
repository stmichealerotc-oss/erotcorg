// Verify @sparticuz/chromium installation
console.log('========================================');
console.log('Verifying @sparticuz/chromium Installation');
console.log('========================================');
console.log('');

// Check if @sparticuz/chromium is installed
try {
    console.log('1. Checking if @sparticuz/chromium module exists...');
    const chromium = require('@sparticuz/chromium');
    console.log('   ✅ @sparticuz/chromium module loaded successfully');
    console.log('');
    
    // Check if puppeteer-core is installed
    console.log('2. Checking if puppeteer-core module exists...');
    const puppeteer = require('puppeteer-core');
    console.log('   ✅ puppeteer-core module loaded successfully');
    console.log('');
    
    // Try to get executable path
    console.log('3. Getting Chromium executable path...');
    chromium.executablePath().then(path => {
        console.log('   ✅ Chromium executable path:', path);
        console.log('');
        console.log('========================================');
        console.log('✅ ALL CHECKS PASSED');
        console.log('========================================');
        console.log('');
        console.log('@sparticuz/chromium is properly installed and configured.');
        console.log('Receipt email PDF generation should work.');
        process.exit(0);
    }).catch(error => {
        console.error('   ❌ Failed to get executable path:', error.message);
        console.log('');
        console.log('========================================');
        console.log('❌ CHROMIUM BINARY NOT AVAILABLE');
        console.log('========================================');
        console.log('');
        console.log('The module is installed but the binary is not available.');
        console.log('This may happen on first run. Try restarting the app.');
        process.exit(1);
    });
    
} catch (error) {
    console.error('   ❌ Failed to load @sparticuz/chromium:', error.message);
    console.log('');
    console.log('========================================');
    console.log('❌ MODULE NOT INSTALLED');
    console.log('========================================');
    console.log('');
    console.log('Possible causes:');
    console.log('1. npm install did not run properly');
    console.log('2. node_modules was not deployed');
    console.log('3. Package is not in package.json');
    console.log('');
    console.log('Solution:');
    console.log('1. Check package.json has @sparticuz/chromium');
    console.log('2. Run: npm install');
    console.log('3. Redeploy to Azure');
    process.exit(1);
}
