Here's what's genuinely still open, organized by why it's still open:

Real security gap (only one left)

#3 — Public product image upload has no auth. POST /api/products/upload-image is reachable with zero login. Rate-limited now, but not access-controlled.
Blocked on an external account/credential (scaffolded, can't finish without it)

Payment gateway (checkout's "Payment" step is a static mockup, no Stripe/Razorpay account)
Real SMS/OTP delivery (otpSender.js intentionally throws in production until a provider is wired in)
Object storage — uploads still write to local disk, breaks on multi-instance
Error monitoring/paging (Sentry or similar) — logs exist, nothing alerts anyone
Uptime monitoring
Blocked on a decision only you can make

Admin roles/permissions taxonomy (audit log exists; the permission model to check actions against doesn't)
Where this repo actually lives (no git remote yet, so CI has literally never run)
Redis vs. the current single-instance in-process cache
Whether the backend will ever run more than one instance
Real but lower-priority gaps, correctly scoped out

createOrder() hardcodes shipping.email — checkout never actually collects one
GET /orders from profile/page.tsx sends no Authorization header (inconsistent with every other call)
/subscribe is fully simulated (setTimeout, no backend)
Admin getChannelPerformance is 100% mocked (no source/attribution field exists to aggregate from)
Admin dashboard//customers still mix real and hardcoded panels (now visibly badged as "Sample data," but the data itself isn't real)
Admin settings page is static/non-functional (now labeled as a preview)
Order detail page has no 404 guard for a bad ID
Refund amounts estimated client-side, independent of backend truth
Sidebar shows a hardcoded placeholder "on duty" admin, not the real logged-in one
Order.itemStatus — dead schema field, never read/written
No centralized validation library (hand-rolled checks vary slightly per controller)
Missing trust proxy config (upload URLs could get the wrong scheme behind a reverse proxy)
Frontend test coverage is still zero (backend has 42 tests, frontends have none)
6 pre-existing lint warnings, non-build-breaking, left alone