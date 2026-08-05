# Feature List

Real, working features vs. mocked/incomplete ones, across all three apps.
See [feature-flows/](feature-flows/) for end-to-end detail on each real feature.
Updated 2026-08-05 after the production-readiness audit's Phase 1-3 fixes —
see [known-limitations.md](known-limitations.md) for the full fix history.

## Customer-facing (fully working)

- Phone + OTP login/signup → [authentication-flow.md](feature-flows/authentication-flow.md)
- Product browsing, search, filter, sort, infinite scroll, per-product SEO metadata → [product-catalog-flow.md](feature-flows/product-catalog-flow.md)
- Product detail with variants, flavor stats, brew guide, reviews
- Guest + authenticated cart with session merge on login, server-trusted pricing → [cart-flow.md](feature-flows/cart-flow.md)
- Persisted favorites (localStorage)
- Checkout (shipping + address management), real coupon codes, order creation with a visible error on failure → [checkout-order-flow.md](feature-flows/checkout-order-flow.md), [coupon-flow.md](feature-flows/coupon-flow.md)
- Order status tracking (Received → Roasting → Packaging → Shipped → Delivered, or Cancelled/Refunded)
- Review submission (goes to moderation queue) + display of approved reviews → [review-flow.md](feature-flows/review-flow.md)
- Saved address CRUD, profile/order history → [user-profile-address-flow.md](feature-flows/user-profile-address-flow.md)

## Admin-facing (fully working)

- Admin phone+OTP login (separate allowlist), token in an httpOnly cookie only → [authentication-flow.md](feature-flows/authentication-flow.md)
- Product CRUD + image upload → [admin-product-management-flow.md](feature-flows/admin-product-management-flow.md)
- CSV bulk product import (dry-run + create/upsert modes)
- Category CRUD + image upload → [admin-category-management-flow.md](feature-flows/admin-category-management-flow.md)
- Coupon CRUD (percent/flat/free-shipping, usage caps, expiry, min order amount) → [coupon-flow.md](feature-flows/coupon-flow.md)
- Order list with real server-side pagination/search/filter, status update (incl. cancel/refund reason capture) → [admin-order-management-flow.md](feature-flows/admin-order-management-flow.md)
- Customer list/search + per-customer order history → [admin-customer-management-flow.md](feature-flows/admin-customer-management-flow.md)
- Review moderation (approve / delete-as-reject) → [review-flow.md](feature-flows/review-flow.md)
- Dashboard: real revenue/sales/overview/fulfillment-queue/inventory stats and low-stock/activity feed → [admin-dashboard-analytics-flow.md](feature-flows/admin-dashboard-analytics-flow.md) (channel performance still intentionally mocked, see below)

## Present in UI but mocked, static, or non-functional

- **Payment processing** — checkout's payment step is a visual mockup only; no gateway. Blocked on a provider account, see [blocked-external-resources.md](blocked-external-resources.md).
- **Subscription (`/subscribe`)** — fully simulated with `setTimeout`, no backend.
- **Admin dashboard channel performance** — 100% hardcoded mock data (no channel/attribution field exists in the schema — a missing feature, not a bug; code now says so explicitly).
- **Admin dashboard "Priority tasks" / "Segment notes" / "Activity feed" (static parts)** — hardcoded content styled like live data (unrelated to the real `getRecentActivities` feed also on the dashboard, which is real).
- **Admin settings page** — static display, no functionality.
- **Customer "Coffee Matchmaker" quiz** — built, never rendered (dead code).
- **Customer profile "Secure Payment", "Account Rituals" tabs** — placeholder-only.
- **SMS/OTP delivery** — no actual delivery mechanism exists yet; `otpSender.js` is a ready-to-configure abstraction that intentionally fails loudly in production until a real provider is wired in. OTP itself is now always randomly generated (no longer hardcoded). Blocked on a provider account, see [blocked-external-resources.md](blocked-external-resources.md).

## Not present at all

- No notifications system (email/push/SMS) — blocked partly on the same SMS provider gap above.
- No inventory/stock management UI beyond per-variant `stock` numbers on the product form (the dashboard's low-stock alerts and inventory endpoint are real now, but there's no dedicated inventory management screen).
- No recipe/production/roasting workflow beyond the order status labels (the labels — "Roasting", "Packaging" — are cosmetic order-status strings, not a real production system).
- No multi-admin roles/permissions (all admins are equal — a single phone-number allowlist, no granular permissions, no action audit log).
- No refund/payment reversal integration (refund amounts are calculated/display-only).
- No object storage — uploads go to local disk, which won't survive horizontal scaling. Blocked on a bucket/credentials, see [blocked-external-resources.md](blocked-external-resources.md).
- No error monitoring/paging or uptime monitoring — structured logging exists, but nothing consumes it to alert a human. Blocked on accounts, see [blocked-external-resources.md](blocked-external-resources.md).
