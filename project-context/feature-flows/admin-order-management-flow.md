# Admin Order Management Flow

## Purpose

Let admins view all orders, update order status (including cancel/refund with
a required reason), and inspect order detail/fulfillment info.

## Entry Point

`front-end/admin-frontend/src/app/orders/page.tsx`

## Related APIs

- `GET /api/admin/orders` (fetches **all** orders — no server-side pagination/filtering)
- `GET /api/admin/orders/:orderId`
- `PATCH /api/admin/orders/:orderId` (status update, `{status, cancelReason?, refundReason?}`)
- `POST /api/admin/orders/:orderId/advance` (linear advance — defined in the API client but **never called** from any admin page; dead code on the frontend)

All `protect + requireAdmin`. These reuse the exact same `orderController.js`
functions as the public, unauthenticated `/api/orders*` routes — see
[known-limitations.md](../known-limitations.md) #2.

## Related Controllers

`orderController.js` (`listOrders`, `getOrderById`, `updateOrderStatus`, `advanceOrderStatus`)

## Related Services

None directly in this flow (stock/cart side-effects belong to order *creation*, see [checkout-order-flow.md](checkout-order-flow.md)).

## Related Models

`Order`

## Frontend Pages

- `app/orders/page.tsx` — list with client-computed metrics (avg order value,
  pending-processing count, dispatch rate), status dropdown per row
  (`Received, Roasting, Packaging, Shipped, Delivered, Cancelled, Refunded`),
  selecting Cancelled/Refunded auto-expands the row and requires a reason
  before Save is enabled. Expandable row also shows a **client-side-computed
  refund estimate** (`calculateRefundAmount`) — display-only, independent of
  any backend refund calculation.
- `app/orders/[orderId]/page.tsx` — read-only detail (shipping, items,
  timeline, totals). **No `notFound()` guard** — a bad/missing order ID likely
  crashes this page (unlike the equivalent product detail page).

## Admin Pages

This is the admin flow itself.

## Database Tables

`orders`

## Important Business Rules

- Status transitions via `PATCH` require `cancelReason` when setting
  `Cancelled` and `refundReason` when setting `Refunded`; otherwise mostly
  unconstrained (no forward-only guard on this endpoint — see [checkout-order-flow.md](checkout-order-flow.md)).
- The order list has **no server-side pagination** — `getOrders()` fetches
  every order and all search/filter/sort happens client-side via `useMemo`.
  This will degrade as order volume grows.
- Refund amounts shown in the expanded row are computed **in the browser**
  (proportional discount/tax/shipping split for cancelled/refunded items),
  not fetched from the backend — could diverge from whatever real refund
  logic exists/gets added server-side later.

## Dependencies

- [checkout-order-flow.md](checkout-order-flow.md) — shares the `Order` model and controller entirely; this is the admin read/update side of that same data
- [admin-dashboard-analytics-flow.md](admin-dashboard-analytics-flow.md) — dashboard's fulfillment queue/revenue stats read from the same `Order` collection (independently, via separate aggregates)

## Files Involved

```
backend/src/controllers/orderController.js
backend/src/routes/adminOrderRoutes.js
backend/src/models/Order.js
front-end/admin-frontend/src/app/orders/page.tsx
front-end/admin-frontend/src/app/orders/[orderId]/page.tsx
front-end/admin-frontend/src/lib/admin-order-api.ts
```

## Common Mistakes

- Assuming `/orders/[orderId]` handles a missing order gracefully — it
  doesn't; add a `notFound()`/error check before building on top of it.
- Assuming the order list's search/filter is server-driven — it's entirely
  client-side against a full fetch of every order.
- Assuming the displayed refund amount comes from the backend — it's a
  frontend-only estimate.
- Trying to call `advanceOrderStatus` from the admin UI expecting it to be
  wired up — it's defined in `admin-order-api.ts` but not used by any page.

## Future Extension Points

- Add server-side pagination/filtering to `GET /api/admin/orders` (mirroring
  how products/customers/reviews already work) before order volume grows.
- Add a `notFound()`/error boundary to `orders/[orderId]/page.tsx`.
- Move refund calculation to the backend so the number shown to admins is
  authoritative, not a client-side estimate.
