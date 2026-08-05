# User Profile / Address Flow

## Purpose

Let a logged-in customer view their profile, manage saved shipping addresses,
and see their order history.

## Entry Point

`front-end/frontend/src/app/profile/page.tsx`

## Related APIs

- `GET /api/users/me`
- `GET /api/users/me/addresses`
- `POST /api/users/me/addresses`
- `PATCH /api/users/me/addresses/:addressId`
- `DELETE /api/users/me/addresses/:addressId`
- `GET /api/orders` (order history tab — see note below)

## Related Controllers

`userController.js` (`getCurrentUser`, `listAddresses`, `createAddress`, `updateAddress`, `deleteAddress`)

## Related Services

`addressService.js` (`getUserAddresses`, `migrateEmbeddedAddresses`, `serializeAddress`)

## Related Models

`User`, `Address` (canonical store — see [database.md](../database.md) for the legacy `User.addresses` duplication note)

## Frontend Pages

`app/profile/page.tsx` — redirects to `/login` if no stored session. Tabs:
**Order History** (real, via `getOrders()` + `normalizeOrderEntry`/`OrderTimeline`,
falls back to a hardcoded mock array while loading), **Vault Addresses** (full
CRUD form), **Exclusive Offers** (hardcoded coupon display, non-functional
button), **Secure Payment**/**Account Rituals** (both unimplemented
placeholders). A large "Command Center" hero block (avatar, taste radar,
loyalty points) exists in source but is fully commented out.

Address management is also reused inside `app/checkout/page.tsx`'s Shipping
step (same `lib/user-api.ts` functions).

## Admin Pages

None directly — admin sees a read-only version of a customer's order history
via [admin-customer-management-flow.md](admin-customer-management-flow.md) (different endpoint, different linkage mechanism).

## Database Tables

`users`, `addresses`, `orders` (read-only, for history)

## Important Business Rules

- `validateAddressPayload`: name required, phone must be 10 digits, address/city/state/country required, zip must match `^[0-9]{4,10}$`.
- New address becomes `isDefault` automatically if it's the user's first
  address, or if explicitly requested.
- Deleting the default address auto-promotes another remaining address to default (`refreshDefaultAddress`).
- All address operations are scoped by `{ _id, user: user._id }` — solid
  ownership checks, no cross-user leakage.
- Address reads (`getUserAddresses`) transparently migrate any legacy
  `User.addresses` embedded entries into the `Address` collection on first
  call if the collection is empty for that user.
- **Order history caveat**: `GET /api/orders` is called from the profile page
  with **no Authorization header** and returns all orders publicly (see
  [known-limitations.md](../known-limitations.md) #6, #22) — this page's
  "your order history" is not actually server-filtered to the logged-in user
  in a verifiable way from the frontend code alone; treat this as suspect if
  touching order-history-related work.

## Dependencies

- [checkout-order-flow.md](checkout-order-flow.md) — shares address CRUD and order history data
- [authentication-flow.md](authentication-flow.md) — page-level login gate

## Files Involved

```
backend/src/controllers/userController.js
backend/src/routes/userRoutes.js
backend/src/services/addressService.js
backend/src/models/User.js
backend/src/models/Address.js
front-end/frontend/src/app/profile/page.tsx
front-end/frontend/src/lib/user-api.ts
front-end/frontend/src/lib/order-api.ts
```

## Common Mistakes

- Writing new address logic against `User.addresses` (embedded) instead of
  the `Address` collection — the embedded array is legacy/stale.
- Assuming the commented-out "Command Center" block in `profile/page.tsx` is
  active UI — it's dead code left in source.
- Assuming "Order History" is guaranteed to be scoped to the current user on
  the backend — verify this before relying on it for anything security-sensitive.

## Future Extension Points

- Fix `getOrders()` to actually filter by the authenticated user server-side
  (requires adding `Order.user` — see [known-limitations.md](../known-limitations.md) #6).
- Implement the "Secure Payment" and "Account Rituals" tabs, or remove them.
- Either wire up "Exclusive Offers" to a real coupon system or remove the
  non-functional "Lock In Reward" button.
