# State Management

No global state library (Redux/Zustand/Jotai) in either frontend. State is
React Context (one each, cart-focused) + local component state + localStorage
+ backend as the source of truth for cart/orders/products.

## Customer frontend

### Auth state (`lib/auth.ts`)

- **Storage**: `localStorage`, keys `aura_auth_session` (`{token, user}`) and
  `aura_guest_session_id` (UUID for anonymous cart tracking).
- **No cookies.**
- Two ways to read it, used inconsistently across the codebase:
  - `getStoredSession()` / `getAuthToken()` — synchronous, localStorage-only,
    **does not verify the token is still valid** server-side.
  - `getVerifiedAuthToken()` — async, pings `GET /users/me`, caches validity
    for 60s (`SESSION_VALIDATION_WINDOW_MS`); clears the session on `401`.
- **Cross-component sync mechanism**: `storeSession()`/`clearSession()`
  dispatch a custom `window` event `"auth-changed"`. `Navbar.tsx` and
  `CartContext.tsx` listen for it (plus the native `"storage"` event) to
  re-render/re-fetch on login/logout — this event is the *only* way auth
  changes propagate outside of a full page reload, since there's no context
  wrapping auth state itself.
- Inconsistency to know about: `order-api.ts`, `user-api.ts`, `review-api.ts`
  use the **unverified** `getAuthToken()` for attaching bearer headers, while
  `CartContext.tsx`, `Navbar.tsx`, `checkout/page.tsx` use the **verified**
  async version. Functionally both usually work; the verified version is
  strictly safer when the UI must decide "is this user actually still logged
  in" (vs. just "attach a header if we have one").

### Cart + favorites state (`context/CartContext.tsx`, `AppProvider`)

- **Cart is backend-persisted**, not localStorage. The Context is a thin
  client over the `/api/cart*` endpoints (see [cart-flow.md](feature-flows/cart-flow.md)).
- Guest vs. authenticated branching happens inside every cart function via
  `getVerifiedAuthToken()` — if present, hits `/cart/me...` with `Authorization`;
  else hits `/cart...` with `x-session-id: <guestSessionId>`.
- On mount: `initializeCart()` (guarded by a `didInitialize` ref so it runs
  once) — if a session exists, first `attachGuestCartToUser()` (merge) then
  `fetchCart()`; else just `fetchCart()`. Re-syncs on `"auth-changed"`.
- `isCartReady` boolean gates rendering in consuming pages (spinner until true).
- Exposed via `useCart()`/`useAppContext()`: `cart`, `addToCart`,
  `removeFromCart`, `updateQuantity`, `clearCart`, `cartTotal` (derived),
  `cartCount` (derived), `isCartReady`, `favorites`, `toggleFavorite`, `isFavorite`.
- **Favorites are plain in-memory `useState`** — not persisted anywhere
  (no localStorage, no backend). Lost on every page refresh.

### Everything else

Page-local `useState`/`useEffect` per page (shop filters, checkout wizard
step, profile tabs, etc.) — no cross-page persistence beyond what's described
above. Shop filter/sort/search state is **not** synced to the URL except the
`category` query param.

## Admin frontend

### Auth state (`lib/admin-auth.ts`)

- **Storage**: `localStorage` key `admin_token`, **plus** a second,
  non-httpOnly cookie the client sets itself via `document.cookie` (`admin_token`,
  `SameSite=Lax`, 7-day max-age) — in addition to the httpOnly cookie the
  *backend* also sets on login. So up to two `admin_token` values can exist
  (server httpOnly cookie + client-readable cookie), plus localStorage.
- `lib/admin-api.ts`'s `adminFetch()` wrapper: on the server (SSR), forwards
  the incoming request's `cookie` header via `next/headers`; on the client,
  reads `localStorage` and sets both `Authorization: Bearer` and a custom
  `x-admin-token` header, plus always `credentials: "include"`.
- Route-level gating is **not** component state — it's `src/proxy.ts`
  (Next.js middleware), which only checks for cookie/header *presence*, not
  validity. See [routing.md](routing.md).
- No global "current admin" state/context — `AdminSessionUser` data isn't
  stored anywhere accessible after login (the sidebar shows a hardcoded
  placeholder name instead of the real logged-in admin).

### Dashboard/list state

Each admin page independently `useEffect`-fetches its own data on mount and
on filter changes (no shared cache, no SWR/React Query) — e.g. the dashboard's
`SalesOverviewCard` and `RecentActivitiesCard` each self-fetch, independent of
the parent page's own `Promise.all` fetch of overview/revenue/channels/queue.
`getOrders()` fetches the **entire** order collection and does all
filter/sort/search client-side via `useMemo` (no server-side pagination for orders,
unlike products/customers/reviews which do paginate server-side).
