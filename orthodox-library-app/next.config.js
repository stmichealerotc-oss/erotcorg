/** @type {import('next').NextConfig} */
const nextConfig = {
  // note: not using static export; app will run as a normal Next.js server
  // by default Next.js exposes any env vars prefixed with NEXT_PUBLIC to the client
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001",
  },
};

module.exports = nextConfig;
