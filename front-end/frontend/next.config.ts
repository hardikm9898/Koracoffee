import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Produces .next/standalone (a minimal server + only the node_modules it
  // actually needs) so the built app can be packaged and run without
  // `npm install`/`npm run build` on the target machine. See
  // deploy/package-standalone.mjs.
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "5000",
      },
    ],
  },
};

export default nextConfig;
