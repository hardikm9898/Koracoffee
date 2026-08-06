import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces .next/standalone (a minimal server + only the node_modules it
  // actually needs) so the built app can be packaged and run without
  // `npm install`/`npm run build` on the target machine. See
  // deploy/package-standalone.mjs.
  output: "standalone",
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
