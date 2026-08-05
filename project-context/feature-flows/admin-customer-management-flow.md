# Admin Customer Management Flow

## Purpose

Let admins search/browse registered customers and inspect an individual
customer's order history and spend.

## Entry Point

`front-end/admin-frontend/src/app/customers/page.tsx`

## Related APIs

- `GET /api/admin/users?page=&limit=&search=` (search by name or phone, 25/page)
- `GET /api/admin/users/:userId`
- `GET /api/admin/users/:userId/orders?limit=`
- `PATCH /api/admin/users/:userId` (`name`, `phoneNumber`, `isVerified`) — now used by `customers/[userId]/page.tsx`'s "Account" card
- `DELETE /api/admin/users/:userId` — now used by the same card

All `protect + requireAdmin`.

## Related Controllers

`adminUserController.js` (`getAllUsers`, `getUserById`, `getUserOrderHistory`, `updateUser`, `deleteUser`)

## Related Services

None directly — controller aggregates `Address` (per-user counts) and matches `Order` by phone.

## Related Models

`User`, `Address` (count only), `Order` (matched by phone, not a ref)

## Frontend Pages

- `app/customers/page.tsx` — paginated/searchable table (name, address count,
  last login, phone, joined date, verified badge), plus a hardcoded
  `customerSegments` panel (same static data reused on the dashboard, not
  backend-driven). No inline edit/delete here — that's on the detail page.
- `app/customers/[userId]/page.tsx` — an "Account" card (edit name/phone/
  verified, delete customer, both wired to `updateUser`/`deleteUser`) above
  the read-only stats: total orders, total spend, avg order value, purchase
  cadence (avg days between orders), full order history table.

## Admin Pages

This is the admin flow itself. There's no customer-facing equivalent (the
customer's own view of their orders is [user-profile-address-flow.md](user-profile-address-flow.md), a different endpoint).

## Database Tables

`users`, `addresses` (aggregate count), `orders` (matched, not joined)

## Important Business Rules

- **Order history linkage now uses `Order.user` (ObjectId ref) as the primary
  match**, with `Order.shipping.phone === User.phoneNumber` kept only as a
  fallback for orders created before `Order.user` existed, or genuine
  guest/gift orders. New orders are reliably linked regardless of what
  contact phone was entered at checkout. See [known-limitations.md](../known-limitations.md) #6.
- Per-user address counts are computed via a single `Address.aggregate`
  grouped by `user`, joined in-memory (avoids N+1 queries).
- `summarizeOrderCadence` computes average days between consecutive orders
  and the most recent order date for the customer-detail stat cards.
- Deleting a customer does **not** cascade-delete their orders — `Order.user`
  is left pointing at a now-nonexistent `User` (same pattern as any other
  "orders outlive other data" case in this schema). Verified live:
  update/delete both work correctly end-to-end against the real backend.

## Dependencies

- [checkout-order-flow.md](checkout-order-flow.md) / [admin-order-management-flow.md](admin-order-management-flow.md) — order data surfaced here comes from the same `Order` collection, joined loosely by phone
- [user-profile-address-flow.md](user-profile-address-flow.md) — same `User`/`Address` models, customer-facing counterpart

## Files Involved

```
backend/src/controllers/adminUserController.js
backend/src/routes/adminUserRoutes.js
backend/src/models/User.js
backend/src/models/Address.js
backend/src/models/Order.js
front-end/admin-frontend/src/app/customers/page.tsx
front-end/admin-frontend/src/app/customers/[userId]/page.tsx
front-end/admin-frontend/src/lib/admin-user-api.ts
```

## Common Mistakes

- Assuming a customer's order history is guaranteed complete for orders
  placed **before** `Order.user` existed — those still rely on the phone
  fallback and can miss orders placed with a different shipping phone.
  Orders placed going forward are unaffected by this.
- Assuming `customerSegments` shown on this page reflects real backend
  segmentation — it's the same hardcoded array used on the dashboard.

## Future Extension Points

- ~~Add a real `Order.user` ObjectId ref~~ **Done** — see above.
- ~~Build the edit/delete customer UI~~ **Done** — see above.
- Replace the hardcoded `customerSegments` panel with a real backend
  aggregation if customer segmentation becomes a real feature.
