import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  ...(process.env.NEXT_DIST_DIR
    ? {
        distDir: process.env.NEXT_DIST_DIR,
      }
    : {}),
};

export default nextConfig;
