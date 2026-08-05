# Authentication

Phone number + OTP only. No passwords, no email/social login, no separate
signup screen (signup is implicit in the OTP-request step). Two independent
flows: **customer** and **admin**, both issuing JWTs from the same
`services/tokenService.js`, but with different transport (bearer-only vs.
cookie+bearer) and different authorization checks.

## Customer login flow

1. `POST /api/auth/request-otp` `{ name, phoneNumber }` — phone normalized to
   digits-only, must be exactly 10 digits. Creates/updates the `User`, stores
   `otpCode`/`otpExpiresAt`. Returns `{ phoneNumber, expiresAt }`, plus the raw
   `otp` **only when `NODE_ENV !== "production"`**.
2. `POST /api/auth/verify-otp` `{ phoneNumber, otp, name? }` — validates OTP
   match + not expired, sets `isVerified=true`, `lastLoginAt=now`, clears OTP
   fields (single-use). Issues JWT via `generateToken({ userId, phoneNumber })`
   (**no `isAdmin` claim**). Returns `{ token, user }` in the **response body only**
   — no cookie is ever set for regular users.
3. Frontend (`front-end/frontend/src/lib/auth.ts`) stores `{ token, user }` in
   `localStorage` key `aura_auth_session` and dispatches a `window` event
   `"auth-changed"` that other parts of the app listen for (Navbar, CartContext).
   All authenticated API calls attach `Authorization: Bearer <token>` manually.

## Admin login flow

1. `POST /api/auth/admin/request-otp` `{ phoneNumber, name? }` — phone must be
   in the `ADMIN_PHONE_NUMBERS` env allowlist (`403` if not, checked via
   `utils/adminAuth.js#isAdminPhoneNumber`).
2. `POST /api/auth/admin/verify-otp` `{ phoneNumber, otp }` — same OTP checks
   as customer flow. On success issues JWT **with `isAdmin: true`** claim, and:
   - Sets an `httpOnly` cookie `admin_token` (`getAdminCookieOptions()`:
     `sameSite` env-overridable, defaults `"lax"`/`"none"` by `NODE_ENV`;
     `secure` true in production; `maxAge` 7 days).
   - **Also returns the token in the JSON body** as a documented fallback for
     cross-origin cookie issues.
3. Admin frontend (`front-end/admin-frontend/src/lib/admin-auth.ts`) stores the
   token in **both** `localStorage` (`admin_token`) **and** a second,
   **non-httpOnly, JS-writable** `document.cookie` it sets itself. This
   contradicts the login page's own UI copy, which claims the token "stays out
   of browser storage" via an httpOnly cookie — see [known-limitations.md](known-limitations.md).
4. `GET /api/auth/admin/me` (protected) returns the sanitized admin user.
5. `POST /api/auth/admin/logout` (no auth required) clears the `admin_token`
   cookie server-side. The frontend also clears its own `localStorage` entry,
   but does not explicitly clear the client-set cookie — relies on the
   backend's `Set-Cookie` clearing it.

## OTP mechanics

`services/otpService.js`:
- `generateOtp()` and `generateAdminOtp()` are now the **same** random
  6-digit generator (`crypto.randomInt(100000, 1000000)`). Neither is ever
  fixed/predictable — the previous hardcoded `"111111"` admin OTP has been removed.
- `services/otpSender.js` is a new delivery abstraction called from
  `authController.requestOtp`/`requestAdminOtp` right after the OTP is
  generated and persisted:
  - Non-production (`NODE_ENV !== "production"`): logs `[otp:dev] OTP for <phone>: <otp>`
    to the server console (dev convenience — no real provider needed locally).
  - Production (`NODE_ENV === "production"`): **throws** unless a real
    SMS/WhatsApp provider has been wired into that file — this fails the
    OTP request loudly rather than silently pretending delivery succeeded.
  - **No real provider is integrated yet.** Do not set `NODE_ENV=production`
    in a deploy until one is added, or login will hard-fail for everyone.
- The API response still additionally echoes `otp` in the JSON body when
  `NODE_ENV !== "production"` (unchanged dev convenience, separate from the
  console log above) — the admin/customer login pages render this as
  "Development OTP". This will stop happening automatically once
  `NODE_ENV=production` is set.
- `.env.example` (backend) documents all of this.

## Token verification (`middlewares/authMiddleware.js`)

- `getRequestToken(req)`: checks `Authorization: Bearer <token>` header first,
  then falls back to manually parsing the raw `Cookie` header for `admin_token`
  or `auth_token` (a custom parser — no `cookie-parser` package). **`auth_token`
  is dead code** — nothing ever sets a cookie by that name; regular users are
  always bearer-token-only.
- `protect`: `401` if no token; `jwt.verify` (`401` if invalid/expired); loads
  `User.findById(decoded.userId)` (`401` if missing); sets `req.user`,
  `req.auth = decoded`, and:
  ```
  req.userIsAdmin = decoded.isAdmin === true || isAdminPhoneNumber(user.phoneNumber)
  ```
  Admin status is **re-validated live against the current env allowlist on
  every request**, not just trusted from the JWT claim — so revoking an admin
  phone number from `ADMIN_PHONE_NUMBERS` takes effect immediately even for
  already-issued tokens.
- `requireAdmin`: `403` if `!req.user || !req.userIsAdmin`.

## Admin status is config, not data

There is **no `isAdmin`/`role` field on the `User` model**. `utils/adminAuth.js`
parses `ADMIN_PHONE_NUMBERS` (comma-separated env var) into a normalized set
and checks membership. Granting/revoking admin access means editing this env
var and redeploying/restarting — not a database operation.

## Middleware applied per route group (backend)

| Group | Middleware |
|---|---|
| `authRoutes` (except `/admin/me`) | none |
| `productRoutes`, `categoryRoutes` (public, non-`/admin`) | **none — including POST/PATCH/DELETE** |
| `cartRoutes` non-`/me*` | none (guest, via `sessionId`) |
| `cartRoutes` `/me*`, `/attach-session` | `protect` |
| `orderRoutes` `POST /` | `protect` |
| `orderRoutes` GET/PATCH/advance (public prefix) | **none** |
| `userRoutes` (all) | `protect` |
| `reviewRoutes` (GET + POST) | none |
| `uploadRoutes` (public product image upload) | none |
| every `admin*Routes` file | `protect` + `requireAdmin` (applied once via `router.use(...)` at top of file) |

The public product/category/order routers having no auth on mutating verbs is
flagged in detail in [known-limitations.md](known-limitations.md) — treat any
task touching those routers as a chance to flag this, not assume it's intentional.

## Frontend auth-state patterns

- **Customer app**: `getStoredSession()` (sync, localStorage read) for instant
  checks; `getVerifiedAuthToken()` (async, pings `GET /users/me`, 60s cache) for
  checks that must be trustworthy (Navbar auth display, CartContext auth/guest
  branching, checkout gate). These two are used inconsistently across files —
  see [state-management.md](state-management.md).
- **Admin app**: route protection is enforced by `src/proxy.ts`, Next.js
  middleware (despite the filename, **not** an API/CORS proxy) that checks for
  an `admin_token` cookie (or `Authorization`/`x-admin-token` headers, which
  in practice only matter for direct API-style requests, not page navigation)
  and redirects to `/login` if absent, or away from `/login` if present. It
  does not verify the token is valid/unexpired — only that it exists.
