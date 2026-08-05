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
9. ~~**Address data duplication.**~~ **RESOLVED.** New
   `seeders/backfillAddresses.js` (`npm run backfill:addresses`) migrates
   any remaining embedded `User.addresses[]` into the `Address` collection
   and then `$unset`s the field from every user document — run once
   against the real dev database (found 0 users with embedded data there,
   so it was a no-op on this DB, but exercised the real migration path).
   The embedded field was then removed from `models/User.js` entirely, and
   `addressService.migrateEmbeddedAddresses` was deleted (nothing left to
   migrate from) — `getUserAddresses` now just queries `Address` directly.
   Verified live end-to-end: login, create/list/delete address via the
   real API all still work correctly post-cleanup.
   **A separate, pre-existing bug was found (not fixed) while verifying
   this**: `userController.validateAddressPayload` requires every field
   (`name`, `phone`, `address`, `city`, `state`, `country`, `zip`) even on
   `PATCH /api/users/me/addresses/:id` — a true partial update (e.g.
   `{"city": "..."}`) fails with `400 "Address name is required"`. Not
   fixed here because it's unrelated to the embedded-field cleanup this
   item covers, and impact today is zero — both `checkout/page.tsx` and
   `profile/page.tsx` already always submit the complete address form on
   edit, client-validated first, so this never actually triggers in the
   real app. Would bite any future API consumer that tries a genuine
   partial PATCH (e.g. a quick "set as default" toggle without resending
   the whole form).
10. **`Order.itemStatus` sub-schema is defined but never used** anywhere in
    `orderController.js` — dead field, always empty.
11. ~~**No cascade protection on delete.**~~ **RESOLVED.**
    `categoryController.deleteCategory` now checks
    `Product.countDocuments({ category: id })` first and returns `409`
    (with the count, in the message) if any products still reference it —
    blocks the delete rather than leaving an orphaned ref. Deliberately a
    block, not a cascade (deleting a category shouldn't silently delete or
    orphan products). `productController.deleteProduct` now also deletes
    every `Review` matching the product's numeric `productId`
    (`Review.deleteMany`) — deliberately a cascade here, since an orphaned
    review with no product to attach to is meaningless, unlike a category.
    Both covered by `tests/referentialIntegrity.test.js` (4 tests).

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
17. ~~Coupon `"FREESHIP"` discount calculation, `Math.min(shippingFee, shippingFee)`~~
    **RESOLVED** — this whole calculation was replaced by
    `services/couponService.js`, which sets `discountAmount = shippingFee`
    directly for `type: "shipping"` coupons, no self-comparison. See
    [coupon-flow.md](feature-flows/coupon-flow.md).

## Frontend — customer app

18. ~~**Favorites are not persisted**~~ **RESOLVED (localStorage).**
    `CartContext.tsx` now hydrates `favorites` from `localStorage`
    (`aura_favorites`) on mount and writes back on every change. Scoped
    deliberately to localStorage-only, not a full backend-synced wishlist
    (the cart's pattern) — this fixes the actual bug (silent data loss on
    refresh) without building a bigger feature. Verified via full type-check,
    lint, and production build; no browser tool available to click through
    it interactively — see the note this pattern already established for
    the checkout-error fix.
19. **Checkout's payment step is a non-functional visual mockup** (`**** **** **** 4242`),
    yet UI copy claims "Secure Stripe Payment" / "AES-256 bank-level encryption".
20. **`createOrder()` hardcodes `shipping.email: "customer@aura.coffee"`** —
    the checkout form never actually collects an email.
21. ~~**Coupons are 100% client-side**~~ **RESOLVED.** A real `Coupon`
    model + `services/couponService.js` (shared by a public preview
    endpoint and order creation) replaced the hardcoded tables in both
    frontends and the backend. This fix also caught and fixed a genuine,
    previously-undiscovered bug: the old backend's percent-off formula
    used the raw stored value (`20` for "20%") instead of `value/100`,
    so applying `AURA20` always computed a ~2000% discount and order
    creation always failed with `400`. See
    [coupon-flow.md](feature-flows/coupon-flow.md) for the full writeup and
    live verification, both before and after the fix.
22. **`GET /orders` (order history) is called with no Authorization header**
    from `profile/page.tsx` — inconsistent with every other authenticated call.
23. ~~**Order-placement failures are silently swallowed**~~ **RESOLVED.**
    `checkout/page.tsx` now has an `orderError` state, set from the caught
    error's message (or a generic fallback) in `processOrder()`'s catch
    block, and rendered as a visible red banner above the step-navigation
    buttons. `isProcessing` already reset via `finally`, so re-enabling the
    "Complete Order" button and letting the user click it again *is* the
    retry — no separate retry button was needed. Verified via a full
    production build (`next build`) succeeding with no type/compile errors;
    no browser-automation tool was available in this environment to click
    through the actual failure path interactively, so this wasn't verified
    in a live browser — only statically (types, lint, build, code review).
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
27a. ~~**No per-page SEO metadata**~~ **RESOLVED.** Every page previously
     shared one generic `<title>`/description from the root layout — no
     `generateMetadata`/`robots.txt`/`sitemap.ts` existed anywhere. Fixed:
     `app/layout.tsx` now sets `metadataBase` + a `title.template`
     (`"%s | Aura Coffee"`); `app/shop/page.tsx` has static shop-specific
     metadata; `app/shop/[id]/page.tsx` has a `generateMetadata()` using the
     real product name/description/image for title, description, and
     OpenGraph. New `app/robots.ts` (disallows `/checkout`, `/profile`,
     `/cart`) and `app/sitemap.ts` (static routes + every product, paginated
     through the backend's 30-item page cap rather than just the first
     page) — both are Next.js App Router metadata-route conventions, served
     at `/robots.txt`/`/sitemap.xml` automatically. New env var
     `NEXT_PUBLIC_SITE_URL` (documented in `.env.example`) drives the
     absolute URLs in both. Verified live: a built+started instance served
     a real `/robots.txt`, a `/sitemap.xml` containing both real product
     IDs from the dev database, and `/shop/1` had `<title>Kenya AA | Aura
     Coffee</title>` and a real per-product `<meta name="description">` —
     previously every page shared the same generic title/description.

## Frontend — admin app

28. **Settings page is entirely static/non-functional.** Now has an
    explicit "preview, not yet functional" notice banner (see #29) so it
    isn't mistaken for real, working settings — the underlying gap
    (no backend integration at all) is unchanged.
29. ~~**Dashboard mixes real and hardcoded data with no visual distinction**~~
    **PARTIALLY RESOLVED.** `AdminCard.tsx` now accepts a `badge` prop; a
    new exported `SampleDataBadge` ("Sample data", amber pill) is applied
    to "Priority tasks", "Segment notes", and the hardcoded "Activity feed"
    panel on the dashboard, and to "Key segments" on `/customers` (same
    underlying `customerSegments` array). The data itself is still
    hardcoded — this only fixes "can an admin tell which panels are real,"
    not "make the fake ones real." Making the data itself real is still
    open — see the "Future Extension Points" sections of
    [admin-dashboard-analytics-flow.md](feature-flows/admin-dashboard-analytics-flow.md)
    and [admin-customer-management-flow.md](feature-flows/admin-customer-management-flow.md).
    Also added a static "preview, not yet functional" notice banner to the
    `/settings` page (item #28) for the same honesty reason.
30. ~~**Customer edit/delete UI doesn't exist**~~ **RESOLVED.** An "Account"
    card was added to `customers/[userId]/page.tsx` — inline edit
    (name/phone/verified) and a delete button, both wired to the
    already-working `updateUser`/`deleteUser` API client functions.
    Deleting a customer does **not** delete their past orders (`Order.user`
    is left pointing at a now-nonexistent user; this matches how the rest
    of the schema already handles orders outliving other data). Verified
    live end-to-end against the real backend: created a throwaway customer
    via the OTP flow, updated their name/verified status via the admin
    endpoint, deleted them, confirmed a subsequent `GET` returns `404`.
31. ~~**Order list has no server-side pagination**~~ **RESOLVED.**
    `orderController.listOrders` now supports `page`/`limit` (default 25,
    capped at 100) plus a `search` query param (regex across `orderCode`,
    `shipping.name/email/phone/address/city/zip`) — shared by both
    `/api/orders` (self-scoped) and `/api/admin/orders` (unscoped for
    admins). Response shape changed from a flat array to
    `{ items, pagination, summary }` (`summary` = average order value /
    pending / dispatch rate, computed over the full filtered set via
    aggregate, not just the current page — so it doesn't silently change
    meaning depending on which page you're viewing). Both frontends'
    `getOrders()` were updated to match; the admin orders page now does
    real server-side search/filter/pagination with Prev/Next controls
    (matching the pattern already used on `/customers`) instead of fetching
    every order and filtering client-side. Verified live: `limit=1` returns
    exactly 1 item with correct pagination metadata; a non-matching search
    returns an empty page with accurate `total:0`.
32. **Order detail page has no 404 guard** — unlike the products detail page,
    a bad order ID likely crashes `orders/[orderId]/page.tsx`.
33. **Refund amounts are estimated client-side**, independent of whatever the
    backend actually computes — could diverge from real refund logic.
34. **`src/proxy.ts` is misleadingly named** — it's auth-guard middleware, not
    a CORS/API proxy; the browser calls the backend directly.
35. Sidebar shows a hardcoded placeholder "on duty" admin identity, not the
    real logged-in admin.

## Backend — style / maintainability

35a. ~~**Zero automated tests anywhere.**~~ **PARTIALLY RESOLVED.** New
     `jest`/`supertest` integration suite in `backend/tests/` (`npm test`,
     `--runInBand`) covers the highest-financial-risk logic verified by
     hand earlier in this session: price-trust on cart/order (client price
     always ignored), the atomic stock-decrement race fix (5 concurrent
     orders for 1 unit of stock → exactly 1 succeeds), multi-item rollback,
     order auth/scoping, and OTP randomness/admin-allowlist behavior. Runs
     against a real MongoDB using a dedicated `<db>-test` database (derived
     from `MONGODB_URI`), auto-created and `dropDatabase()`d per run —
     **not** an in-memory server (`mongodb-memory-server`'s postinstall
     binary download wasn't reliable in this environment, so it was
     removed after installing). This means tests need a reachable MongoDB;
     see `.github/workflows/ci.yml` for how CI provides one. Frontend test
     coverage (customer + admin) is still nonexistent — only the backend
     has tests so far.
36. Multer config duplicated near-verbatim across 4+ route files.
37. No centralized validation library — hand-rolled checks vary slightly
    between controllers for logically identical fields (e.g. zip regex).
38. ~~`errorHandler` never logs errors server-side~~ **RESOLVED.** New
    `utils/logger.js` (pino — pretty-printed in dev, plain JSON lines in
    production) is used in `errorHandler.js`: every error is logged with
    method/path/statusCode and the full stack (`logger.error` for `statusCode >= 500`,
    `logger.warn` for expected `4xx` `ApiError`s). Also used for
    server-startup/DB-connection logging (`server.js`, `config/db.js`)
    instead of raw `console.log`/`console.error`. Verified live: a genuine
    500 (an uncaught Mongoose `CastError` from a malformed ObjectId) now
    logs a full structured entry with stack trace, where previously it left
    no trace beyond morgan's one-line request log. No log-shipping/APM
    service is wired up — this only fixes "does the error get logged
    anywhere," not "does anyone get paged about it." That's still a real
    gap (see [feature-list.md](feature-list.md) / the original audit's
    Phase 1 monitoring item) — Sentry or an equivalent needs a real account
    to actually wire up, which wasn't available to do here.
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

## DevOps

42. ~~**No CI pipeline.**~~ **RESOLVED.** `.github/workflows/ci.yml` runs on
    every push/PR to `main`/`master`: a `backend` job (spins up a real
    `mongo:7` service container, runs `npm test` — the jest suite from
    #35a — plus a `node --check` syntax pass over every source file since
    the backend has no lint script configured yet), and `frontend`/
    `admin-frontend` jobs (`npm run lint` — non-blocking, see #43 below —
    then `npm run build`, which is the real gate). **Not yet verified
    end-to-end** — this repo has no git remote configured, so GitHub
    Actions has never actually run this workflow; only verified locally
    (YAML syntax validated with `js-yaml`, and every individual command the
    workflow runs was executed locally and passed). Push to a GitHub remote
    to see it run for real.
43. **Pre-existing lint errors in both frontends, unrelated to any fix in
    this session.** A `react-hooks/set-state-in-effect` pattern (calling
    `setLoading(true)`/`setError(null)` synchronously at the top of a
    data-fetching `useEffect`) trips a strict lint rule in 6 files:
    `admin-frontend/src/app/customers/[userId]/page.tsx`,
    `components/admin/RecentActivitiesCard.tsx`, `SalesOverviewCard.tsx`;
    `frontend/src/components/shop/ProductDetailClient.tsx` plus 4
    `no-explicit-any` errors in `components/home/ScrollAnimation.tsx`.
    These don't break the build (only `npm run lint`, which CI now runs
    non-blocking — see #42), so they were left alone rather than risk
    behavior changes across files with no browser-level test coverage to
    verify against. One **build-breaking** issue in the same family
    (`front-end/admin-frontend/src/app/orders/page.tsx:555`,
    `order.discountAmount` possibly `undefined`) *was* fixed, since it
    blocked `next build` entirely — see `admin-order-management-flow.md`.

## When to update this file

Add an entry here whenever a task uncovers a new bug/gap, and remove/mark an
entry as resolved when a task actually fixes one — don't let this drift from
reality.
