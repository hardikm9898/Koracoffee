---
name: blocked-external-resources
description: Everything from the production-readiness audit that cannot be finished without an external account, credential, or business decision only the project owner can provide.
---

# Blocked on External Resources / Decisions

This is a standing checklist, updated as work progresses through the audit
roadmap. Everything here is otherwise understood and scoped (the code path
to wire it into is known) — the only blocker is a real account, credential,
or a decision that isn't mine to make. Discuss/provide these, then any of
this becomes a normal implementation task.

## Needs a real external account/credential

| Item | What's needed | Where it plugs in | Status |
|---|---|---|---|
| **Real OTP delivery (SMS/WhatsApp)** | An account with a provider (Twilio, MSG91, etc.) + API key | `backend/src/services/otpSender.js` — the abstraction is already built and intentionally throws in production until a provider is configured | Scaffolded, not wired. Explicitly deferred 2026-08-05 ("think about it in future") in favor of a soft launch aimed at Razorpay's site-review requirement, not real customer logins. **Neither `NODE_ENV` state is safe for real user traffic in the meantime** — see [known-limitations.md](known-limitations.md) #4 for why. Revisit before actually promoting login to real customers. |
| **Payment gateway** | A provider account (Stripe/Razorpay/etc.) + sandbox and live API keys, plus a decision on *which* provider | `checkout/page.tsx`'s "Payment" step is currently a static mockup; `orderController.createOrder` would need a payment-intent/verification step before marking an order paid | Not started — highest-effort remaining item |
| **Object storage (S3-compatible)** | A bucket + access keys (AWS S3, Cloudflare R2, DigitalOcean Spaces, etc.) | `backend/src/controllers/uploadController.js` and the 5 multer route configs currently write to local disk (`src/public/uploads/`) — this breaks the moment the backend runs on more than one instance behind a load balancer | Not started |
| **Error monitoring / paging (Sentry or equivalent)** | An account + DSN | Structured logging already exists (`utils/logger.js`) — this would consume those logs and alert someone, which logging alone doesn't do | Not started |
| **Uptime monitoring** | An account (Better Uptime, Pingdom, UptimeRobot, etc.) | Points at `/api/health`, which itself needs hardening first (currently a static 200, doesn't check DB connectivity) | Not started |

## Needs a decision, not a credential

| Item | Decision needed | Notes |
|---|---|---|
| **Admin roles/permissions** | What roles should exist (e.g. "Super Admin", "Product Manager", "Support"?) and what each should be allowed to do | Not something to invent unilaterally — this is a product/org decision. The *mechanical* half of "roles + audit log" is done: every admin mutation (who, what endpoint, when, success/failure) is now recorded and viewable at `/audit-log` in the admin app — see [known-limitations.md](known-limitations.md) #46. All admins remain equal (a single `ADMIN_PHONE_NUMBERS` allowlist) until an actual roles decision is made; the audit log records actions but has no permission model to check them against yet. |
| **Branch protection rules** | Required reviews, required CI checks before merge, who can push to `main` | Depends on a git remote existing first |
| **Redis / distributed cache** | Whether it's worth the operational overhead yet, and which provider (self-hosted, Upstash, ElastiCache, etc.) | No Redis instance is reachable in this environment. `backend/src/utils/cache.js` implements a working in-process TTL cache for product/category listing instead (see [known-limitations.md](known-limitations.md) #45) — correct and effective for a single instance, but each instance gets its own independent cache once the backend is scaled horizontally, so it doesn't help past that point. |
| **Multi-instance / horizontal scaling plan** | Whether the backend will ever run more than one instance | Blocks on object storage (above) and affects several "works today, breaks at scale" items already logged in [known-limitations.md](known-limitations.md) |

## How this list is maintained

- When an item above gets unblocked (credential provided, decision made),
  move it out of this file into an actual implementation task, then delete
  the row here.
- When a new audit or task surfaces something else that's blocked the same
  way, add it here rather than letting it live only in a chat transcript.
