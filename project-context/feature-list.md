# Feature List

Real, working features vs. mocked/incomplete ones, across all three apps.
See [feature-flows/](feature-flows/) for end-to-end detail on each real feature.

## Customer-facing (fully working)

- Phone + OTP login/signup → [authentication-flow.md](feature-flows/authentication-flow.md)
- Product browsing, search, filter, sort, infinite scroll → [product-catalog-flow.md](feature-flows/product-catalog-flow.md)
- Product detail with variants, flavor stats, brew guide, reviews
- Guest + authenticated cart with session merge on login → [cart-flow.md](feature-flows/cart-flow.md)
- Checkout (shipping + address management) and order creation → [checkout-order-flow.md](feature-flows/checkout-order-flow.md)
- Order status tracking (Received → Roasting → Packaging → Shipped → Delivered, or Cancelled/Refunded)
- Review submission (goes to moderation queue) + display of approved reviews → [review-flow.md](feature-flows/review-flow.md)
- Saved address CRUD, profile/order history → [user-profile-address-flow.md](feature-flows/user-profile-address-flow.md)

## Admin-facing (fully working)

- Admin phone+OTP login (separate allowlist) → [authentication-flow.md](feature-flows/authentication-flow.md)
- Product CRUD + image upload → [admin-product-management-flow.md](feature-flows/admin-product-management-flow.md)
- CSV bulk product import (dry-run + create/upsert modes)
- Category CRUD + image upload → [admin-category-management-flow.md](feature-flows/admin-category-management-flow.md)
- Order list, status update (incl. cancel/refund reason capture) → [admin-order-management-flow.md](feature-flows/admin-order-management-flow.md)
- Customer list/search + per-customer order history → [admin-customer-management-flow.md](feature-flows/admin-customer-management-flow.md)
- Review moderation (approve / delete-as-reject) → [review-flow.md](feature-flows/review-flow.md)
- Dashboard: real revenue/sales/overview stats and low-stock/activity feed → [admin-dashboard-analytics-flow.md](feature-flows/admin-dashboard-analytics-flow.md) (partially — several analytics endpoints are broken, see that doc)

## Present in UI but mocked, static, or non-functional

- **Payment processing** — checkout's payment step is a visual mockup only; no gateway.
- **Coupons** — hardcoded client-side (and separately hardcoded server-side); no `Coupon` model/admin UI.
- **Subscription (`/subscribe`)** — fully simulated with `setTimeout`, no backend.
- **Favorites/wishlist** — in-memory only, not persisted.
- **Admin dashboard channel performance** — 100% hardcoded mock data.
- **Admin dashboard "Priority tasks" / "Segment notes" / "Activity feed" (static parts)** — hardcoded content styled like live data.
- **Admin settings page** — static display, no functionality.
- **Admin product inventory analytics endpoint** — random/fake numbers, likely throws at runtime.
- **Customer "Coffee Matchmaker" quiz** — built, never rendered (dead code).
- **Customer profile "Exclusive Offers", "Secure Payment", "Account Rituals" tabs** — hardcoded or placeholder-only.
- **SMS/OTP delivery** — no actual delivery mechanism exists; OTP is returned in the API response for dev convenience (and is hardcoded to `"111111"` outside production, and always for admin).

## Not present at all

- No notifications system (email/push/SMS).
- No inventory/stock management UI beyond per-variant `stock` numbers on the product form (no low-stock alerts UI beyond the dashboard activity feed).
- No recipe/production/roasting workflow beyond the order status labels (the labels — "Roasting", "Packaging" — are cosmetic order-status strings, not a real production system).
- No multi-admin roles/permissions (all admins are equal — a single phone-number allowlist, no granular permissions).
- No refund/payment reversal integration (refund amounts are calculated/display-only).
