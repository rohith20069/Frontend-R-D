import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for catching issues early
  reactStrictMode: true,

  // Optimize production builds
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Experimental features for React 19
  experimental: {
    // Optimize package imports
    optimizePackageImports: [],
  },
};

export default nextConfig;
