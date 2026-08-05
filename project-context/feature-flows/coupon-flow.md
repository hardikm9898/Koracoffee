# Coupon Flow

## Purpose

Let admins create/manage discount codes, let customers preview and apply a
code at checkout, and have the backend be the sole source of truth for
whether a code is valid and what it's worth — added 2026-08-05, replacing a
system where three coupon codes were hardcoded independently in the backend
*and* both frontends, with different (and in one case, badly broken) math
in each place.

## Entry Point

- Customer preview/apply: `front-end/frontend/src/app/checkout/page.tsx` (Review step, coupon field)
- Customer browse: `front-end/frontend/src/app/profile/page.tsx` ("Exclusive Offers" tab)
- Admin management: `front-end/admin-frontend/src/app/coupons/page.tsx`

## Related APIs

- `GET /api/coupons` — public, lists active (non-expired) coupons
- `GET /api/coupons/validate?code=&subtotal=` — public, previews a coupon's discount for a given subtotal
- `GET /api/admin/coupons` — admin, lists all coupons (including inactive/expired)
- `POST /api/admin/coupons` — admin, create
- `PATCH /api/admin/coupons/:id` — admin, update (partial)
- `DELETE /api/admin/coupons/:id` — admin, delete
- `POST /api/orders` — order creation re-resolves and applies the coupon authoritatively (see below)

## Related Controllers

`couponController.js` (`validateCoupon`, `listActiveCoupons`), `adminCouponController.js` (`listCoupons`, `createCoupon`, `updateCoupon`, `deleteCoupon`), `orderController.js` (`buildOrderPayload`, `createOrder` — consumes the shared service)

## Related Services

`couponService.js` — **single source of truth** for coupon resolution and
discount math (`resolveCoupon`, `incrementCouponUsage`). Used by both the
public preview endpoint and order creation, so a coupon can never be
accepted at checkout with different math than what was previewed.

## Related Models

`Coupon` (see [database.md](../database.md)), `Order` (`couponCode`, `discountAmount`, `discountLabel` fields, unchanged)

## Frontend Pages

- `checkout/page.tsx` — coupon code input + "Apply" button calls
  `lib/coupon-api.ts#validateCoupon(code, subtotal)` (a preview only); the
  applied discount is stored client-side and sent as `couponCode` on
  `POST /api/orders`, where it's **re-resolved from scratch** server-side —
  the client never sends a discount amount, only the code.
- `profile/page.tsx` — "Exclusive Offers" tab now fetches
  `lib/coupon-api.ts#getActiveCoupons()` and renders real coupons (was a
  hardcoded 2-item array). The previously non-functional "Lock In Reward"
  button was changed to a working `Link` to `/checkout`.

## Admin Pages

`app/coupons/page.tsx` — summary card + create form + full table (inline
edit, active/inactive toggle, delete), following the same pattern as
`/categories`. Shows `usedCount`/`maxUses` per coupon. Nav link added to
`AdminSidebar.tsx`.

## Database Tables

`coupons` (new)

## Important Business Rules

- **`Coupon.value` for `type: "percent"` is a whole number (20 means 20%),
  not a fraction.** `couponService.resolveCoupon` divides by 100 in the
  formula: `discountAmount = orderAmount * (value / 100)`.
- `type: "flat"` — `value` is a currency amount, capped at the order amount
  (`Math.min(value, orderAmount)`) so a discount can never exceed the total.
- `type: "shipping"` — `value` is unused; discount always equals the
  computed `shippingFee` (currently a fixed ₹5.0 constant in `orderController.js`).
- A coupon is rejected (preview and order creation both) if: `active` is
  `false`, `expiresAt` has passed, `usedCount >= maxUses` (when `maxUses`
  is set — `null` means unlimited), or `subtotal < minOrderAmount`.
- `usedCount` increments **only** after a real order is successfully
  created with that code (`createOrder`, after `Order.create` succeeds) —
  not on preview/validate.
- Coupon codes are case-insensitive from the client's perspective — always
  normalized to uppercase (`Coupon.code` schema has `uppercase: true`, and
  both controllers additionally `.trim().toUpperCase()` before querying).
- `backend/src/seeders/seedCoupons.js` (`npm run seed:coupons`) upserts the
  three legacy hardcoded codes (`AURA20`, `FREESHIP`, `WELCOME50`) so
  removing the hardcoded fallbacks didn't remove the codes themselves — it
  never wipes existing coupons, safe to re-run.

## A real bug this fix caught

The previous hardcoded implementation in `orderController.js` computed the
percent-off discount as `orderAmount * coupon.value` where `value` was
stored as a whole number (`20` for "20%"), instead of `value / 100`. This
meant applying `AURA20` computed a discount roughly **20x** the order total,
which made the order total negative and failed the
`if (!Number.isFinite(total) || total < 0) throw ApiError(...)` guard —
**`AURA20` could never successfully complete an order, at all, ever.**
Verified live against the real dev database before this fix (order request
with `couponCode: "AURA20"` returned `400 "Total must be a valid positive
number"`), and again after the fix (same request returned `201` with a
correct ~20%-of-order discount). A permanent regression test for this exists
in `backend/tests/coupon.test.js`.

## Dependencies

- [checkout-order-flow.md](checkout-order-flow.md) — order creation calls into this flow's `couponService`
- [user-profile-address-flow.md](user-profile-address-flow.md) — profile page's offers tab

## Files Involved

```
backend/src/models/Coupon.js
backend/src/services/couponService.js
backend/src/controllers/couponController.js
backend/src/controllers/adminCouponController.js
backend/src/routes/couponRoutes.js
backend/src/routes/adminCouponRoutes.js
backend/src/seeders/seedCoupons.js
backend/tests/coupon.test.js
front-end/frontend/src/lib/coupon-api.ts
front-end/frontend/src/app/checkout/page.tsx
front-end/frontend/src/app/profile/page.tsx
front-end/admin-frontend/src/lib/admin-coupon-api.ts
front-end/admin-frontend/src/app/coupons/page.tsx
front-end/admin-frontend/src/components/admin/AdminSidebar.tsx
```

## Common Mistakes

- Assuming `Coupon.value` for a percent coupon is a fraction (0-1) — it's a
  whole number (0-100). The old frontend hardcoded table used a fraction
  (`0.2` for 20%); the old backend hardcoded table used a whole number
  (`20`) but the formula expected a fraction — that mismatch was the bug.
  Don't reintroduce it.
- Trusting a client-supplied discount amount — the client only ever sends
  a `couponCode` string; `discountAmount` is always computed server-side,
  both at preview and at order creation.
- Forgetting that `usedCount` only increments on a completed order, not on
  preview/validate — a customer can "check" a code many times without
  consuming uses.

## Future Extension Points

- Per-user coupon restrictions (one use per customer, not just a global cap).
- Coupon-to-product/category restrictions (currently applies to the whole order).
- Auto-generated/unique single-use codes for a referral or loyalty program.
