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
      cwd: "/home/ubuntu/aura-coffee/front-end/frontend",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
      },
      // Must be built first: npm run build (reads .env.production for
      // NEXT_PUBLIC_* vars, which are baked in at build time, not read at
      // runtime — rebuild after changing them).
    },
    {
      name: "aura-admin-frontend",
      cwd: "/home/ubuntu/aura-coffee/front-end/admin-frontend",
      script: "node_modules/.bin/next",
      args: "start -p 3001",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
