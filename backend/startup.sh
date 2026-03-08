#!/bin/bash
# Azure App Service Startup Script for Chromium Support

echo "🚀 Starting St. Michael Church Backend with Chromium support..."

# Set environment variables for Chromium
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/tmp/chromium

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --production
fi

# Verify @sparticuz/chromium is installed
if [ -d "node_modules/@sparticuz/chromium" ]; then
    echo "✅ @sparticuz/chromium found"
else
    echo "⚠️ @sparticuz/chromium not found, installing..."
    npm install @sparticuz/chromium puppeteer-core
fi

# Start the application
echo "🎯 Starting Node.js server..."
node server.js
