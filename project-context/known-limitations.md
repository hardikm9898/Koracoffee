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
3. **Public product image upload has no auth.** `POST /api/products/upload-image`
   is still reachable with no login — an open catalog-image abuse vector.
   It is now covered by the general rate limiter (see #41 below), which
   caps abuse volume but does not close the auth gap itself.
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
5. ~~**Admin token storage contradicts its own UI copy.**~~ **RESOLVED.**
   `lib/admin-auth.ts` no longer writes the token to `localStorage` or a
   JS-writable cookie — the backend's httpOnly `admin_token` cookie (already
   set via `credentials: "include"`) is now the only place the token lives,
   matching what the login page's copy always claimed. `lib/admin-api.ts`'s
   `adminFetch` no longer attaches `Authorization`/`x-admin-token` headers
   from localStorage (there's nothing there to read anymore); it still
   forwards cookies on SSR requests, which was already correct.
   `proxy.ts`'s `hasAdminToken` now only checks the cookie — the header
   checks it used to do were never reachable for a real page navigation
   anyway, so removing them doesn't weaken anything (see [authentication.md](../authentication.md)).

## Data integrity / correctness

6. ~~**`Order` has no `user` reference.**~~ **RESOLVED for new orders.**
   `Order.user` (ObjectId ref) now exists and is stamped at creation time
   (`orderController.createOrder`, `protect` already guarantees `req.user`).
   `adminUserController.getUserOrderHistory` now matches
   `{ $or: [{ user }, { "shipping.phone": phoneNumber }] }` — the phone match
   is kept as a fallback for orders placed **before** this field existed, and
   for genuine guest/gift orders. Orders created going forward are reliably
   linked; historical pre-migration orders still rely on the phone match.
7. ~~**Prices are client-trusted.**~~ **RESOLVED.** New `services/pricingService.js`
   (`resolveItemPrice(productId, variant)`) is the single source of truth for
   price: it looks up `Product.variants[]` by label (using `discountPrice`
   when set), or — for products with no `variants[]` defined (true of every
   seeded product) — falls back to the same 100g/250g/500g multiplier table
   the frontend uses (`lib/data.ts` `VARIANTS`), applied to `basePrice`.
   `cartController.addCartItem` and `orderController.buildOrderPayload` both
   call this and **ignore** any price/name/image the client sent. Verified
   live: a request with `price: 0.01` on a ₹16 product was correctly priced
   at ₹16 in both the cart and the created order. `updateCartItem` never
   trusted price to begin with (quantity-only), so it needed no change.
8. ~~**Stock decrement is not transactional.**~~ **RESOLVED — but not via
   Mongoose transactions.** This deployment's MongoDB is a **standalone
   instance, not a replica set** — verified live: wrapping a real write in
   `session.withTransaction()` fails with `"Transaction numbers are only
   allowed on a replica set member or mongos"`. (An earlier check using
   `session.startTransaction()` around a no-op `admin().ping()` misleadingly
   "succeeded" — that doesn't exercise a real write, so don't trust that
   pattern to mean transactions actually work here.)
   The real fix: `applyOrderInventoryChanges` now decrements stock via a
   single atomic `findOneAndUpdate` per line item, whose query condition
   (`stock >= quantity`) and `$inc` happen together as one MongoDB
   operation — no separate "check" step exists anymore for a race to open
   up in. Verified live: 5 concurrent order requests against a variant with
   exactly 1 unit of stock — exactly 1 succeeded, the other 4 got a clean
   "insufficient stock" `400`, and stock never went negative. Because
   there's no transaction wrapping multiple documents, a multi-item order
   failing partway through needs manual compensation: `applyOrderInventoryChanges`
   tracks what it already decremented and rolls it back on a later item's
   failure; `createOrder` does the same if `Order.create` itself fails after
   stock was successfully reserved. Verified live: a 2-item order where item
   A had stock and item B didn't correctly left item A's stock exactly
   where it started (not permanently short).
9. **Address data duplication.** `User.addresses` (embedded, legacy) vs.
   `Address` collection (canonical). `addressService.migrateEmbeddedAddresses`
   copies on first read but nothing ever clears the embedded array — it's
   permanently stale after the first migration.
10. **`Order.itemStatus` sub-schema is defined but never used** anywhere in
    `orderController.js` — dead field, always empty.
11. **No cascade protection on delete.** Deleting a `Category` doesn't check
    for `Product`s still referencing it (orphaned ref). Deleting a `Product`
    doesn't clean up related `Review`s (orphaned `productId`).

## Admin analytics (`adminAnalyticsController.js`)

12. ~~**Status-enum casing bug.**~~ **RESOLVED.** `getOverviewStats` and
    `getRevenueSeries` now use `{ $nin: NON_REVENUE_STATUSES }` (the same
    constant `getSalesOverview` already used correctly) instead of comparing
    against lowercase strings; "orders fulfilled" now matches `status: "Delivered"`
    exactly (there is no `"completed"` status in the schema — that half of
    the old `$in` clause could never match anything). Verified live against
    real data: gross revenue and orders-fulfilled now return non-zero values.
13. ~~**`getOverviewStats`'s "returning customers" aggregation groups by
    `$userId`**~~ **RESOLVED.** Now groups by `Order.user` (the real field,
    added in an earlier fix — see #6), with a `$match: { user: { $ne: null } }`
    first so guest/pre-migration orders (`user: null`) aren't miscounted as
    one repeat customer.
14. ~~**`getFulfillmentQueue` populates a non-existent `userId` field**~~
    **RESOLVED** — the no-op `.populate('userId', ...)` call was removed
    (customer name already came from `order.shipping.name`, unaffected). The
    status filter itself was also fixed — see #12's pattern; it now matches
    `["Received","Roasting","Packaging","Shipped"]`, the real non-terminal
    statuses, instead of a list that matched nothing. `getETA()`'s switch
    cases were updated to match these real (lowercased) status strings too.
    Verified live: returns `200` with real (possibly empty, correctly so)
    data instead of an unconditionally-empty array.
15. ~~**`getProductInventory` likely throws at runtime**~~ **RESOLVED.** The
    query now `.populate('category', 'name')` instead of treating the raw
    ObjectId as a string. `stock`/`status` are now derived from real
    `Product.variants[].stock` (`stock: null` when a product has no
    per-variant tracking — an honest "unknown" instead of a random number);
    the `sellThrough`/`nextBatch` fields were removed entirely since there
    was no real data source for them (faking them was worse than omitting
    them) — the admin-frontend `AdminProductInventoryItem` type was updated
    to match. Verified live: returns `200` with real category names and
    honest stock/status values instead of 500ing.
16. **`getChannelPerformance` returns 100% hardcoded mock data.** Left as-is
    — there is no channel/attribution field anywhere in the schema to
    aggregate from; this needs a real feature (a `source` field on `Order`
    populated at checkout), not a bug fix. Now has an explicit
    "INTENTIONALLY MOCKED" comment in the code so it doesn't get mistaken
    for a bug again. Still tracked as a real gap.
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
41. ~~No `helmet`, no rate limiting anywhere.~~ **RESOLVED.** `app.js` now
    applies `helmet()` (with `crossOriginResourcePolicy: "cross-origin"` and
    `crossOriginEmbedderPolicy: false` explicitly, since `/uploads` images
    are consumed cross-origin by both frontends — verified live that image
    responses still carry a `cross-origin` CORP header) and a general
    rate limiter (`middlewares/rateLimiters.js`, 300 req/15min per IP) on
    every `/api` route. A stricter limiter (20 req/15min) additionally
    guards the four OTP request/verify endpoints in `authRoutes.js` — verified
    live that the 21st rapid request to `/auth/request-otp` returns `429`.
    This does not add auth to any route that lacked it (see #1–#3) — it only
    bounds abuse volume against whatever *is* reachable.

## When to update this file

Add an entry here whenever a task uncovers a new bug/gap, and remove/mark an
entry as resolved when a task actually fixes one — don't let this drift from
reality.
