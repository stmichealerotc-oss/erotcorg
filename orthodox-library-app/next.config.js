/** @type {import('next').NextConfig} */
const path = require('path');

// Production backend URL — Azure App Service
const PRODUCTION_API = 'https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net';

// Use env var if set, otherwise use production URL in production builds,
// or localhost for local development
const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? PRODUCTION_API : 'http://localhost:3001');

const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  env: {
    NEXT_PUBLIC_API_BASE_URL: apiBase,
  },
};

module.exports = nextConfig;
