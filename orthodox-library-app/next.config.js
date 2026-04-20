/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  },
  // Suppress workspace root warning
  outputFileTracingRoot: require('path').join(__dirname),
};

module.exports = nextConfig;
