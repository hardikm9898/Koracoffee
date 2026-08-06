---
name: deployment-aws
description: Step-by-step guide to deploying this app (backend + both Next.js frontends) on AWS Lightsail with MongoDB Atlas, and pointing a GoDaddy-registered domain at it.
---

# Deploying to AWS (Lightsail + Atlas), domain on GoDaddy

Decided 2026-08-05: compute on AWS Lightsail (nothing created yet at the
time of writing), database on MongoDB Atlas, domain stays registered at
GoDaddy — GoDaddy only manages DNS records pointing at the Lightsail
instance. This removes two rows from
[blocked-external-resources.md](blocked-external-resources.md): "Git remote
/ hosting" is being decided here, and Atlas gives this app its first real
MongoDB replica set (relevant to
[known-limitations.md](known-limitations.md) #8 — the stock-decrement fix
doesn't need transactions, but a replica set means they'd work if ever
needed later).

Replace `yourdomain.com` everywhere below with the real domain.

## Domain layout used throughout this guide

| Subdomain | Serves | Port (behind Nginx) |
|---|---|---|
| `yourdomain.com` / `www.yourdomain.com` | Customer storefront | 3000 |
| `admin.yourdomain.com` | Admin dashboard | 3001 |
| `api.yourdomain.com` | Backend API | 5000 |

## 0. Get the latest code onto GitHub

A remote already exists: `origin` → `github.com/hardikm9898/Koracoffee.git`
(confirmed 2026-08-05, superseding the earlier "no remote configured" note
in [known-limitations.md](known-limitations.md) #42 — update that entry
once you've confirmed whether `.github/workflows/ci.yml` has actually run
on GitHub). Push whatever you want deployed:

```
git push origin dev   # or whichever branch you want as the deploy source
```

The Lightsail instance will `git clone`/`git pull` from this same remote
(step 3 below) rather than copying files manually.

## 1. MongoDB Atlas

1. Create a free account at mongodb.com/cloud/atlas, create a new project,
   create a cluster (the free M0 tier is enough to start).
2. **Database Access** → add a database user (username/password, not the
   Atlas account login) — this is what goes in `MONGODB_URI`.
3. **Network Access** → add an IP allowlist entry for the Lightsail
   instance's static IP once you have it (step 2 below). Using `0.0.0.0/0`
   temporarily to test from your laptop is fine, but tighten it to just the
   instance's IP before going live.
4. **Connect** → "Drivers" → copy the `mongodb+srv://...` connection
   string. This is `MONGODB_URI` in `backend/.env` — the database name in
   the URI can be anything (e.g. `/coffee-ecommerce`), Atlas creates it on
   first write.

## 2. Create the Lightsail instance

1. AWS Console → Lightsail → **Create instance**.
2. Platform: Linux/Unix. Blueprint: **Ubuntu 22.04 LTS** (OS Only, not an
   app blueprint — this app needs Node directly, not the bundled ones
   Lightsail offers).
3. Pick an instance plan — the smallest ($5–7/mo tier) is enough for a
   small storefront running 3 lightweight Node processes.
4. Create the instance, then under its **Networking** tab:
   - Attach a **static IP** (free while attached to a running instance) —
     this is the IP GoDaddy's DNS records will point at.
   - Firewall rules: allow **22** (SSH, already default), **80**, **443**.
     Do **not** open 3000/3001/5000 to the internet — Nginx is the only
     thing that should be reachable externally; the three Node processes
     stay on `127.0.0.1` behind it.

## 3. Server setup (SSH into the instance)

```bash
sudo apt update && sudo apt upgrade -y

# Node.js (use whatever LTS matches what you developed against)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx git

sudo npm install -g pm2

# Clone the repo (from step 0)
git clone https://github.com/hardikm9898/Koracoffee.git aura-coffee
cd aura-coffee
```

## 4. Configure environment variables

**`backend/.env`** (copy `backend/.env.example` and fill in):
```
MONGODB_URI=<Atlas connection string from step 1>
JWT_SECRET=<generate a long random string — e.g. `openssl rand -hex 32`>
JWT_EXPIRES_IN=7d
ADMIN_PHONE_NUMBERS=<your real admin phone number(s), comma-separated>
PORT=5000
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
CLIENT_URLS=https://www.yourdomain.com,https://admin.yourdomain.com
OTP_EXPIRY_MINUTES=10
```

**Read this before setting `NODE_ENV=production`**: `services/otpSender.js`
intentionally **throws** in production unless a real SMS/WhatsApp provider
is wired in — see
[blocked-external-resources.md](blocked-external-resources.md). If you go
live without one, OTP login/signup will hard-fail for every user. Either
wire up a provider first, or treat this as a soft-launch blocker.

**`front-end/frontend/.env.production`** (on your **laptop**, not the
server — see "Building the frontends" below):
```
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

**`front-end/admin-frontend/.env.production`** (also on your laptop):
```
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api
```

Next.js bakes `NEXT_PUBLIC_*` vars into the build at build time, not at
runtime — if you ever change one, you must rebuild locally and push again
(see below), not just restart the process.

## 5. Install the backend and start everything with PM2

The frontends are **not** built on the server (see "Building the
frontends" below) — only the backend needs `npm ci` here:

```bash
cd ~/aura-coffee/backend && npm ci

cd ~/aura-coffee
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup   # run the command it prints, once, so PM2 restarts on reboot
```

(`deploy/ecosystem.config.js` and `deploy/nginx-aura-coffee.conf.example`
already exist in the repo — adjust the `cwd` paths in the PM2 file if you
cloned somewhere other than `/home/ubuntu/aura-coffee`.)

## Building the frontends (on your laptop, not the server)

The Lightsail instance's smallest tier doesn't have the CPU/RAM to run
`next build` for both frontends without grinding to a halt, so the build
happens locally and only the finished, runnable output is pushed to
GitHub. `next.config.ts` in both apps sets `output: "standalone"`, and
`npm run build:deploy` (defined in both `package.json`s) runs `next build`
then packages the result — via `deploy/package-standalone.mjs` — into a
self-contained sibling folder that needs no `npm install` to run:

```bash
cd front-end/frontend && npm run build:deploy      # -> front-end/frontend-dist/
cd ../admin-frontend && npm run build:deploy        # -> front-end/admin-frontend-dist/
```

Both `*-dist/` folders are committed to git (they're explicitly un-ignored
in the root `.gitignore`, despite the broad `node_modules`/`.next` ignore
rules) — that's the whole point, so the server can just `git pull` them.
Commit and push both after building:

```bash
git add front-end/frontend-dist front-end/admin-frontend-dist
git commit -m "Rebuild frontends"
git push origin dev
```

`deploy/ecosystem.config.js` runs `node server.js` directly out of
`front-end/frontend-dist` and `front-end/admin-frontend-dist` — not
`next start` — so the server never runs `next build` or `npm install` for
either frontend.

## 6. Nginx + HTTPS

```bash
sudo cp deploy/nginx-aura-coffee.conf.example /etc/nginx/sites-available/aura-coffee
sudo sed -i 's/yourdomain.com/<your real domain>/g' /etc/nginx/sites-available/aura-coffee
sudo ln -s /etc/nginx/sites-available/aura-coffee /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Once DNS (step 7) has actually propagated to this instance's IP:
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d admin.yourdomain.com -d api.yourdomain.com
```

Certbot edits the Nginx config in place to add the `listen 443 ssl` blocks
and sets up auto-renewal — don't hand-write the SSL directives yourself.

## 7. Point GoDaddy's DNS at the instance

In GoDaddy: My Products → DNS → Add records (domain stays registered at
GoDaddy; only these DNS records change):

| Type | Name | Value |
|---|---|---|
| A | `@` | `<Lightsail static IP>` |
| A | `www` | `<Lightsail static IP>` |
| A | `admin` | `<Lightsail static IP>` |
| A | `api` | `<Lightsail static IP>` |

DNS propagation can take anywhere from a few minutes to a few hours.

## Deploying updates later

Backend changes: edit, commit, push, then on the server:
```bash
cd ~/aura-coffee && git pull
cd backend && npm ci && pm2 restart aura-backend
```

Frontend changes: build and push from your **laptop** first (see
"Building the frontends" above), then on the server it's just a pull and
restart — no `npm ci`/`npm run build` needed:
```bash
cd ~/aura-coffee && git pull
pm2 restart aura-frontend aura-admin-frontend
```

## What this doesn't solve yet

- **File uploads still live on local disk** (`backend/src/public/uploads`)
  — fine for a single Lightsail instance, but it means uploads can never be
  shared across more than one instance later without moving to S3 (already
  tracked in [blocked-external-resources.md](blocked-external-resources.md)).
- **OTP delivery** — see the callout in step 4.
- **Payment gateway, error monitoring, uptime monitoring** — all still
  scaffolded-but-not-wired; see
  [blocked-external-resources.md](blocked-external-resources.md).
