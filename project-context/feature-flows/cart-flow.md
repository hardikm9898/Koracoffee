# Cart Flow

## Purpose

Let both guests and logged-in customers build a cart, with guest carts
transparently merging into the user's account cart on login.

## Entry Point

`front-end/frontend/src/context/CartContext.tsx` (`AppProvider`, wraps the
whole app in `layout.tsx`) — every cart interaction goes through this Context,
not directly through `lib/*` calls from pages.

## Related APIs

Guest (`x-session-id` header) and authenticated (`Authorization` header) pairs:

- `GET /api/cart` / `GET /api/cart/me`
- `POST /api/cart/items` / `POST /api/cart/me/items`
- `PATCH /api/cart/items` / `PATCH /api/cart/me/items`
- `DELETE /api/cart/items` / `DELETE /api/cart/me/items`
- `POST /api/cart/clear` / `POST /api/cart/me/clear`
- `POST /api/cart/attach-session` (auth only — merges guest cart into user cart)

## Related Controllers

`cartController.js` (`getCart`, `addCartItem`, `updateCartItem`, `removeCartItem`, `clearCart`, `attachSessionCart`)

## Related Services

`cartService.js` (`serializeCart`, `mergeItems`, `findGuestCart`, `findUserCart`, `createGuestCart`, `createUserCart`)

## Related Models

`Cart` (`user` ref optional, `sessionId`, `items[]` — see [database.md](../database.md))

## Frontend Pages

`context/CartContext.tsx` (state owner), consumed by `Navbar.tsx` (badge),
`app/cart/page.tsx`, `app/checkout/page.tsx`, `app/shop/ShopClient.tsx`,
`components/shop/ProductDetailClient.tsx` (add-to-cart), `app/favorites/page.tsx`
(favorites live in the same Context, see below).

## Admin Pages

None — there is no admin view of customer carts.

## Database Tables

`carts`

## Important Business Rules

- Guest identity = a generated UUID (`aura_guest_session_id` in localStorage),
  sent as `x-session-id`. Authenticated identity = JWT bearer token.
- Every cart action re-checks `getVerifiedAuthToken()` to decide guest vs.
  user endpoint — not a static "am I logged in" flag.
- `addCartItem` merges by `(productId, variant)` key: if the item already
  exists, quantity is **summed** and price/name/image/basePrice are
  **overwritten** by the new payload — meaning the server trusts whatever
  price the client sends on every add, it does not look up `Product.basePrice`/variant price.
- `attachSessionCart` (called once, right after login) merges the guest cart
  into the user's cart via `cartService.mergeItems`, then **deletes** the
  guest cart document.
- `cartTotal`/`cartCount` are always derived on the fly (not persisted fields)
  from stored `price`/`quantity`.
- Cart initialization on the frontend runs once per mount (`didInitialize`
  ref guard): attach-then-fetch if a session exists, else just fetch. Re-runs
  on the `"auth-changed"` window event (login/logout elsewhere in the app).
- **Favorites live in the same Context but are NOT persisted anywhere**
  (plain `useState`, no localStorage/backend) — a page refresh clears them.
  This is a real gap, not by design intent evident anywhere in the code.

## Dependencies

- [authentication-flow.md](authentication-flow.md) — `"auth-changed"` event drives re-sync; guest session ID logic lives in `lib/auth.ts`
- [checkout-order-flow.md](checkout-order-flow.md) — `clearCart()` is called after successful order placement

## Files Involved

```
backend/src/controllers/cartController.js
backend/src/services/cartService.js
backend/src/routes/cartRoutes.js
backend/src/models/Cart.js
front-end/frontend/src/context/CartContext.tsx
front-end/frontend/src/lib/auth.ts   (getGuestSessionId, getVerifiedAuthToken)
front-end/frontend/src/app/cart/page.tsx
```

## Common Mistakes

- Assuming the cart is client-side/localStorage — it's fully backend-persisted;
  every mutation is a network round-trip.
- Assuming favorites persist across sessions/refreshes — they don't (known gap).
- Assuming server validates cart item price against `Product` — it doesn't;
  see [known-limitations.md](../known-limitations.md) #7.
- Forgetting that shipping fee (₹5 flat, free above ₹50) and 8% tax are
  computed **independently and redundantly** in both `cart/page.tsx` and
  `checkout/page.tsx` — a formula change must be applied in both places.

## Future Extension Points

- Persist favorites (localStorage at minimum, or a backend `Favorite`/wishlist
  collection tied to `User`) if the feature should actually work.
- Re-derive cart item price server-side from `Product`/variant data instead of
  trusting client-supplied price, to close the price-trust gap.
- Centralize the shipping/tax calculation instead of duplicating it per page.
