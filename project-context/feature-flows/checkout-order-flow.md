# Checkout / Order Flow

## Purpose

Convert a cart into a placed order: collect shipping address, apply a coupon,
show a (mocked) payment step, create the order, and track its status through
fulfillment.

## Entry Point

`front-end/frontend/src/app/checkout/page.tsx` (3-step wizard: Shipping → Payment → Review)

## Related APIs

- `POST /api/orders` (create, `protect` required)
- `GET /api/orders`, `GET /api/orders/:orderId` (list/detail — **no auth**, see limitations)
- `PATCH /api/orders/:orderId` (status update)
- `POST /api/orders/:orderId/advance` (linear status advance)
- `GET/POST/PATCH/DELETE /api/users/me/addresses*` (address management during checkout)

## Related Controllers

`orderController.js` (`createOrder`, `listOrders`, `getOrderById`, `updateOrderStatus`, `advanceOrderStatus`), `userController.js` (address CRUD)

## Related Services

`cartService.js` (`clearOrderedItemsFromCart`, cart lookup for the items being ordered)

## Related Models

`Order` (see [database.md](../database.md) for full field list), `Product` (stock check/decrement), `Address` (shipping source when reusing a saved address)

## Frontend Pages

- `app/checkout/page.tsx` — redirects to `/login?returnTo=/checkout` if
  unauthenticated; 3-step wizard; confetti "Order Confirmed" inline state on
  success (no separate confirmation route)
- `app/cart/page.tsx` — pre-checkout summary, shipping/tax preview
- `app/profile/page.tsx` — "Order History" tab, expandable timeline per order

## Admin Pages

See [admin-order-management-flow.md](admin-order-management-flow.md) for status updates/refund handling from the admin side.

## Database Tables

`orders`, `products` (stock decrement), `carts` (cleared post-order), `addresses`

## Important Business Rules

- **Order creation is server-computed but client-price-trusting**:
  `subtotal` = sum(item price × qty) using the **client-supplied** per-item
  price (not re-derived from `Product`); `shippingFee` fixed at `5.0`; `tax` =
  8% of subtotal; `total` = subtotal + shipping + tax − discount.
- **Coupons are hardcoded server-side** in `orderController.js`: `AURA20`
  (20% off), `FREESHIP` (waives shipping), `WELCOME50` (flat ₹50 off, capped
  at order amount). No `Coupon` model. The frontend **separately** hardcodes
  the same three codes for its own preview UI — the two lists can drift.
- **Stock validation happens, price validation does not**: `validateOrderItemsAgainstInventory`
  checks each ordered `(productId, variant)` against `Product.variants[].stock`;
  products without a `variants[]` array skip stock checking entirely.
  `applyOrderInventoryChanges` decrements stock **after** order creation, not
  atomically — see [known-limitations.md](../known-limitations.md) #8.
- **Order IDs**: `orderId` = max existing + 1; `orderCode` = `AURA-<year>-<orderId padded to 4>`.
- **Status machine**: enum `Received, Roasting, Packaging, Shipped, Delivered,
  Cancelled, Refunded`. `advanceOrderStatus` only moves forward along
  `Received → Roasting → Packaging → Shipped → Delivered` (Cancelled/Refunded
  are terminal, reachable only via `updateOrderStatus`). `updateOrderStatus`
  requires a `cancelReason` when setting `Cancelled` and a `refundReason` when
  setting `Refunded`, but does **not** otherwise prevent illogical transitions
  (e.g. `Delivered` → `Received` is technically allowed).
- **Payment is entirely mocked** — the "Payment" step UI is a static card
  visual; no Stripe/Razorpay/gateway SDK is called anywhere.
- `shipping.email` sent to the backend is **hardcoded to `"customer@aura.coffee"`**
  by the frontend — the checkout form never collects a real email.
- After successful order creation, the frontend calls `clearCart()` — items
  are removed from the `Cart` document, not just hidden in the UI.
- `Order.itemStatus` (per-item status sub-schema) exists in the model but is
  never populated/used — don't rely on it being present/accurate.

## Dependencies

- [cart-flow.md](cart-flow.md) — order items come directly from the current cart
- [user-profile-address-flow.md](user-profile-address-flow.md) — shipping address reuse/management
- [authentication-flow.md](authentication-flow.md) — checkout requires login

## Files Involved

```
backend/src/controllers/orderController.js
backend/src/routes/orderRoutes.js
backend/src/models/Order.js
backend/src/services/cartService.js
front-end/frontend/src/app/checkout/page.tsx
front-end/frontend/src/app/cart/page.tsx
front-end/frontend/src/app/profile/page.tsx
front-end/frontend/src/lib/order-api.ts
front-end/frontend/src/lib/user-api.ts
```

## Common Mistakes

- Assuming `GET /api/orders`/`GET /api/orders/:id` require auth — they don't
  (public); don't assume order data is private in its current state.
- Assuming a failed order creation shows the user an error — currently it's
  only `console.warn`ed; no visible failure/retry UI exists.
- Assuming coupon codes are validated against a database — they're hardcoded
  in two separate places (backend controller + frontend page).
- Assuming `advanceOrderStatus` and `updateOrderStatus` enforce the same
  transition rules — they don't; `updateOrderStatus` is far more permissive.

## Future Extension Points

- Integrate a real payment gateway before this can process real transactions.
- Move coupons into a real `Coupon` model with backend-only validation.
- Re-derive order item price from `Product`/variant data server-side.
- Wrap order creation + stock decrement in a Mongoose transaction.
- Add a dedicated order-confirmation route instead of an inline checkout state.
- Add user-facing error handling for failed order submission.
