// PM2 process definitions for all three Node processes on the server:
// backend API, customer frontend, admin frontend. Deploy this file to the
// server (e.g. /home/ubuntu/aura-coffee/deploy/ecosystem.config.js) and run:
//   pm2 start deploy/ecosystem.config.js
//   pm2 save
//   pm2 startup   (then run the command it prints, once, so PM2 survives reboots)
//
// Paths below assume the repo is cloned to /home/ubuntu/aura-coffee — adjust
// `cwd` for all three apps if you clone somewhere else.

module.exports = {
  apps: [
    {
      name: "aura-backend",
      cwd: "/home/ubuntu/aura-coffee/backend",
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
      cwd: "/home/ubuntu/aura-coffee/front-end/frontend-dist",
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
      cwd: "/home/ubuntu/aura-coffee/front-end/admin-frontend-dist",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
