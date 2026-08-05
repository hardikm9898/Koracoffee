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

`addressService.js` (`getUserAddresses`, `serializeAddress`)

## Related Models

`User`, `Address` (the only address store — a legacy embedded `User.addresses[]` field was backfilled and removed 2026-08-05, see [database.md](../database.md))

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
- `getUserAddresses` just queries `Address` directly now — no more lazy
  migration from an embedded field (removed 2026-08-05, see [database.md](../database.md)).
- **A separate, pre-existing bug**: `validateAddressPayload` requires every
  field even on `PATCH` (a true partial update fails with `400`). Not
  triggered in practice — both this page and `checkout/page.tsx` always
  submit the complete address form on edit. See [known-limitations.md](../known-limitations.md) #9.
- `GET /api/orders` (order history) is now `protect`-gated and scoped to
  the caller — see [checkout-order-flow.md](checkout-order-flow.md) and
  [known-limitations.md](../known-limitations.md) #2, #6 (both resolved).

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

- Looking for `User.addresses` (embedded) — it no longer exists; `Address` is the only store.
- Assuming the commented-out "Command Center" block in `profile/page.tsx` is
  active UI — it's dead code left in source.
## Future Extension Points

- Implement the "Secure Payment" and "Account Rituals" tabs, or remove them.
- ~~Either wire up "Exclusive Offers" to a real coupon system~~ **Done** — see [coupon-flow.md](coupon-flow.md).
- Fix `validateAddressPayload` to support true partial updates on `PATCH` (see [known-limitations.md](../known-limitations.md) #9) if a future consumer needs it.
