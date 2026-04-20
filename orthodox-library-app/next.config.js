/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // No 'output: export' - let Azure/Oryx handle the Next.js build natively
  outputFileTracingRoot: path.join(__dirname),
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;
