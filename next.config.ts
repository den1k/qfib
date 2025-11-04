import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable static export - use proper SSR for dynamic routes
  // ...(process.env.NODE_ENV === 'production' && {
  //   output: "export",
  //   trailingSlash: true,
  //   images: {
  //     unoptimized: true,
  //   },
  // }),
  // Webpack configuration for better file watching (used when --webpack flag is passed)
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding
      };
    }
    return config;
  },
};

export default nextConfig;
