// PM2 process definitions for all three Node processes on the server:
// backend API, customer frontend, admin frontend. Deploy this file to the
// server and run (from anywhere, e.g. the repo root):
//   pm2 start deploy/ecosystem.config.js
//   pm2 save
//   pm2 startup   (then run the command it prints, once, so PM2 survives reboots)
//
// `cwd` is derived from this file's own location (__dirname), so it works
// no matter where the repo is cloned on the server.

const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

module.exports = {
  apps: [
    {
      name: "aura-backend",
      cwd: path.join(repoRoot, "backend"),
      script: "src/server.js",
      env: {
        NODE_ENV: "production",
      },
      // Reads the rest of its config (MONGODB_URI, JWT_SECRET, etc.) from
      // backend/.env via dotenv at startup — see backend/.env.example.
    },
    {
      name: "aura-frontend",
      // Built locally and committed — `npm run build:deploy` in
      // front-end/frontend packages a self-contained server here (see
      // deploy/package-standalone.mjs). NEXT_PUBLIC_* vars are baked in at
      // that local build time, not read at runtime — rebuild+push after
      // changing them. Server just needs `git pull` + `pm2 restart`, no
      // npm install/build.
      cwd: path.join(repoRoot, "front-end", "frontend-dist"),
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "aura-admin-frontend",
      // Same deal — built locally via `npm run build:deploy` in
      // front-end/admin-frontend.
      cwd: path.join(repoRoot, "front-end", "admin-frontend-dist"),
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
