/** @type {import('next').NextConfig} */
const path = require('path');

// Production backend URL — Azure App Service
const PRODUCTION_API = 'https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net';

// Get env var — treat empty string same as unset
const configuredApi = (process.env.NEXT_PUBLIC_API_BASE_URL || '').trim();

// Is it pointing at localhost? (useless in production)
const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(configuredApi);

// Final API base:
// - If env var is set and is NOT localhost → use it
// - Otherwise → use production URL (in production builds) or localhost (dev)
const apiBase =
  (configuredApi && !isLocalhost)
    ? configuredApi
    : (process.env.NODE_ENV === 'production'
        ? PRODUCTION_API
        : 'http://localhost:3001');

console.log('[next.config.js] NODE_ENV:', process.env.NODE_ENV);
console.log('[next.config.js] NEXT_PUBLIC_API_BASE_URL resolved to:', apiBase);

const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  env: {
    NEXT_PUBLIC_API_BASE_URL: apiBase,
  },
};

module.exports = nextConfig;
