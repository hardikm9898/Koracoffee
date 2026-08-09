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
- **Raw-material inventory, purchasing, BOM, and COGS/profitability (added 2026-08-09, 6 phases, fully wired end-to-end)**:
  - `InventoryItem`/`Supplier`/`InventoryTransaction` (immutable ledger) — atomic increase/decrease via `services/inventoryLedgerService.js`, mirroring the finished-goods stock-decrement pattern in `orderController.js` (no negative stock, no race conditions). Admin UI: `/inventory`, `/inventory/ledger`, `/suppliers`.
  - `Purchase` — draft → confirmed → cancelled lifecycle; stock only increases on confirm (`purchaseController.confirmPurchase`), cancelling a confirmed purchase reverses stock but fails cleanly if that stock's already been consumed elsewhere. Admin UI: `/purchases`.
  - `Recipe`/BOM — per-product (optionally per-variant) bill of materials, live cost estimate from current `avgCost` (`services/recipeService.js`). Admin UI: `/recipes`.
  - **Order → consumption**: when an order's status reaches "Packaging" (`orderController.consumeRawMaterialsForOrder`, hooked into both `updateOrderStatus` and `advanceOrderStatus`), each item's recipe components are atomically decremented and logged to the ledger, referencing the order. Idempotent via `Order.rawMaterialsConsumedAt` — re-entering Packaging never double-consumes. A short-stock component blocks the whole status change and rolls back anything already consumed in that attempt. Products with no recipe are simply skipped — existing orders/products are unaffected.
  - **Cancellation/refund reversal**: if an order that already consumed raw materials is Cancelled or Refunded *before* reaching "Shipped", `orderController.reverseRawMaterialsForOrder` credits back exactly what that order's own ledger rows say was consumed (not recomputed from the current recipe, which may have since changed). Idempotent via `Order.rawMaterialsReversedAt`. Deliberately does **not** reverse for an order that already shipped/delivered — the material is physically gone with the product by then, and crediting it back would inflate stock that doesn't exist. Finished-goods stock (`Product.variants[].stock`) still isn't restored on cancel — that's pre-existing behavior, not touched here.
  - `Expense` + `services/profitabilityService.js` — period profitability (net sales, real ledger-sourced COGS, operating expenses, gross/net profit, margin), a live per-product cost/margin estimate, and a purchase-by-supplier/by-item report. Admin UI: `/expenses`, `/reports`. Expense categories deliberately exclude raw-material/packaging costs (those are COGS via the ledger already) to avoid double-counting.
  - Printable, no-cost-data packing slip with a packaging checklist (excludes raw materials — those are already inside the product by pack time) at `/orders/[orderId]/packing-slip`.
  - **Deliberately not built**: notifications/alerting beyond the existing dashboard counts (no notification system exists anywhere in this codebase to hook into), and no roles/permissions gating on any of this (matches the rest of the app — all admins are equal via the phone allowlist, a previously-deferred product decision, not reopened here).
  - 26 new backend tests covering concurrency, idempotency, rollback-on-partial-failure, reversal-before-vs-after-shipment, and double-counting prevention — all passing alongside the full pre-existing suite (79/79).

## Present in UI but mocked, static, or non-functional

- **Payment processing** — checkout's payment step is a visual mockup only; no gateway. Blocked on a provider account, see [blocked-external-resources.md](blocked-external-resources.md).
- **Subscription (`/subscribe`)** — fully simulated with `setTimeout`, no backend.
- **Admin dashboard channel performance** — 100% hardcoded mock data (no channel/attribution field exists in the schema — a missing feature, not a bug; code now says so explicitly).
- **Admin dashboard "Priority tasks" / "Segment notes" / "Activity feed" (static parts)** — hardcoded content styled like live data (unrelated to the real `getRecentActivities` feed also on the dashboard, which is real).
- **Admin settings page** — static display, no functionality.
- **Customer profile "Secure Payment", "Account Rituals" tabs** — placeholder-only.
- **SMS/OTP delivery** — no actual delivery mechanism exists yet; `otpSender.js` is a ready-to-configure abstraction that intentionally fails loudly in production until a real provider is wired in. OTP itself is now always randomly generated (no longer hardcoded). Blocked on a provider account, see [blocked-external-resources.md](blocked-external-resources.md).

## Not present at all

- No notifications system (email/push/SMS) — blocked partly on the same SMS provider gap above.
- ~~No inventory/stock management UI~~ ~~No recipe/production workflow~~ **Resolved 2026-08-09** — see the raw-material inventory/purchasing/BOM/COGS entry above. Finished-goods stock (`Product.variants[].stock`) is unaffected and remains the separate, existing system that continues to run at order creation, independent of raw-material consumption at Packaging.
- No multi-admin roles/permissions (all admins are equal — a single phone-number allowlist, no granular permissions, no action audit log).
- No refund/payment reversal integration (refund amounts are calculated/display-only).
- No object storage — uploads go to local disk, which won't survive horizontal scaling. Blocked on a bucket/credentials, see [blocked-external-resources.md](blocked-external-resources.md).
- No error monitoring/paging or uptime monitoring — structured logging exists, but nothing consumes it to alert a human. Blocked on accounts, see [blocked-external-resources.md](blocked-external-resources.md).
