# Known Limitations

Consolidated list of real bugs, security gaps, and tech debt found during
codebase analysis (2026-08-05). Check here before assuming unexpected
behavior is a new bug you introduced, and before "fixing" something that
might be relied upon elsewhere.

## Security — high priority

1. ~~**Public product/category routes have no auth on mutating verbs.**~~
   **RESOLVED.** `productRoutes.js`/`categoryRoutes.js` are now GET-only;
   create/update/delete only exist under `/api/admin/products*`/`/api/admin/categories*`
   (`protect+requireAdmin`).
2. ~~**Public order routes leak and allow tampering with all orders.**~~
   **RESOLVED.** `orderRoutes.js` now requires `protect` on every route.
   `listOrders`/`getOrderById` scope results to `req.user` unless
   `req.userIsAdmin` (see `orderController.js`, which now also stamps
   `Order.user` at creation time). Status mutation (`PATCH`, `/advance`) was
   removed from the public router entirely — only reachable via
   `/api/admin/orders` (admin-only), matching how the admin UI already used it.
3. **Public product image upload has no auth or rate limiting.**
   `POST /api/products/upload-image` — open file-upload abuse/storage-exhaustion vector.
4. ~~**OTP is not actually random.**~~ **RESOLVED.** `generateAdminOtp` is now
   the same random generator as `generateOtp` (`crypto.randomInt`, no more
   hardcoded `"111111"` for either flow). A new `services/otpSender.js`
   abstraction now sits between "generate" and "respond": in non-production
   it logs the OTP server-side (dev convenience); in production it
   **throws** unless a real provider is wired in — see the TODO in that
   file. No real SMS/WhatsApp provider is integrated yet, so **do not set
   `NODE_ENV=production` until one is** — auth will hard-fail otherwise
   (intentional: fail loud, not silently insecure). `.env.example` now
   documents this in all three apps.
5. **Admin token storage contradicts its own UI copy.** `admin-frontend`'s
   login page claims the token is "stored in an HTTP-only server cookie" but
   the code also stores it in `localStorage` and a second, non-httpOnly,
   JS-writable cookie — both readable by any injected script (XSS risk).

## Data integrity / correctness

6. ~~**`Order` has no `user` reference.**~~ **RESOLVED for new orders.**
   `Order.user` (ObjectId ref) now exists and is stamped at creation time
   (`orderController.createOrder`, `protect` already guarantees `req.user`).
   `adminUserController.getUserOrderHistory` now matches
   `{ $or: [{ user }, { "shipping.phone": phoneNumber }] }` — the phone match
   is kept as a fallback for orders placed **before** this field existed, and
   for genuine guest/gift orders. Orders created going forward are reliably
   linked; historical pre-migration orders still rely on the phone match.
7. **Prices are client-trusted.** Neither `cartController` (add/update item)
   nor `orderController.buildOrderPayload` re-derive price from
   `Product.basePrice`/variant price server-side — only stock is validated at
   checkout, not price. A malicious client could submit arbitrary low prices.
8. **Stock decrement is not transactional.** `applyOrderInventoryChanges` runs
   as a separate step after `Order.create`, with no Mongoose session — under
   concurrent checkouts of the same low-stock variant, overselling is possible.
9. **Address data duplication.** `User.addresses` (embedded, legacy) vs.
   `Address` collection (canonical). `addressService.migrateEmbeddedAddresses`
   copies on first read but nothing ever clears the embedded array — it's
   permanently stale after the first migration.
10. **`Order.itemStatus` sub-schema is defined but never used** anywhere in
    `orderController.js` — dead field, always empty.
11. **No cascade protection on delete.** Deleting a `Category` doesn't check
    for `Product`s still referencing it (orphaned ref). Deleting a `Product`
    doesn't clean up related `Review`s (orphaned `productId`).

## Broken admin analytics (`adminAnalyticsController.js`)

12. **Status-enum casing bug.** `getOverviewStats`, `getRevenueSeries`, and
    `getFulfillmentQueue` compare `Order.status` against **lowercase** values
    (`"cancelled"`, `"delivered"`, `"completed"`, `"pending"`, etc.) but the
    real enum is capitalized (`"Cancelled"`, `"Delivered"`, ...) — these
    queries silently return empty/zero results. Only `getSalesOverview` uses
    the correct casing, proving this is an oversight, not a convention.
13. **`getOverviewStats`'s "returning customers" aggregation groups by
    `$userId`**, a field that doesn't exist on `Order` — always empty,
    `retentionRate` is always effectively 0.
14. **`getFulfillmentQueue` populates a non-existent `userId` field** — no-op.
15. **`getProductInventory` likely throws at runtime**: calls
    `product.category.slice(0, 3)` where `category` is an unpopulated
    ObjectId (no `.slice()` method) — and even the fields that don't throw
    are `Math.random()`-generated fake data, not real inventory.
16. **`getChannelPerformance` returns 100% hardcoded mock data.**
17. Coupon `"FREESHIP"` discount calculation, `Math.min(shippingFee, shippingFee)`,
    is a no-op/self-comparison that happens to work only because `shippingFee`
    is a fixed constant — fragile if that constant ever becomes dynamic.

## Frontend — customer app

18. **Favorites are not persisted** (in-memory Context only) despite a
    dedicated `/favorites` page and Navbar badge.
19. **Checkout's payment step is a non-functional visual mockup** (`**** **** **** 4242`),
    yet UI copy claims "Secure Stripe Payment" / "AES-256 bank-level encryption".
20. **`createOrder()` hardcodes `shipping.email: "customer@aura.coffee"`** —
    the checkout form never actually collects an email.
21. **Coupons are 100% client-side** — no backend validation.
22. **`GET /orders` (order history) is called with no Authorization header**
    from `profile/page.tsx` — inconsistent with every other authenticated call.
23. **Order-placement failures are silently swallowed** (`console.warn` only,
    no user-facing error/retry UI).
24. **`/subscribe` is entirely simulated** (`setTimeout`, no backend call).
25. **No shared API client module** — base URL + response-parsing logic is
    copy-pasted across 7 `lib/*.ts` files.
26. ~~**No `.env` file committed**~~ **PARTIALLY RESOLVED.** `.env.example`
    now documents `NEXT_PUBLIC_API_BASE_URL` in both frontend apps (and a
    full `.env.example` exists for the backend). The underlying behavior is
    unchanged though: if the real `.env`/deploy env var is left unset, the
    app still silently falls back to `localhost:5000` rather than failing
    loudly — worth hardening if this causes a misconfigured-prod incident.
27. `CoffeeQuiz.tsx` is dead code (built, never rendered).

## Frontend — admin app

28. **Settings page is entirely static/non-functional.**
29. **Dashboard mixes real and hardcoded data with no visual distinction**
    ("Priority tasks", "Segment notes", "Activity feed" panels are static).
30. **Customer edit/delete UI doesn't exist** despite full API support
    (`updateUser`/`deleteUser`/`getUserById` defined but never called).
31. **Order list has no server-side pagination** — fetches every order,
    filters/sorts client-side; won't scale.
32. **Order detail page has no 404 guard** — unlike the products detail page,
    a bad order ID likely crashes `orders/[orderId]/page.tsx`.
33. **Refund amounts are estimated client-side**, independent of whatever the
    backend actually computes — could diverge from real refund logic.
34. **`src/proxy.ts` is misleadingly named** — it's auth-guard middleware, not
    a CORS/API proxy; the browser calls the backend directly.
35. Sidebar shows a hardcoded placeholder "on duty" admin identity, not the
    real logged-in admin.

## Backend — style / maintainability

36. Multer config duplicated near-verbatim across 4+ route files.
37. No centralized validation library — hand-rolled checks vary slightly
    between controllers for logically identical fields (e.g. zip regex).
38. `errorHandler` never logs errors server-side (no `console.error`) —
    production 500 debugging relies solely on `morgan`'s request-line log.
39. No `app.set('trust proxy', ...)` configured, yet absolute upload/review
    image URLs are built from `req.protocol`/`req.get('host')` — wrong scheme
    possible behind a reverse proxy.
40. `authMiddleware`'s `auth_token` cookie fallback is dead code — nothing
    ever sets a cookie by that name for regular users.

## When to update this file

Add an entry here whenever a task uncovers a new bug/gap, and remove/mark an
entry as resolved when a task actually fixes one — don't let this drift from
reality.
