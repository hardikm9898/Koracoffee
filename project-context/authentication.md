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

## OTP mechanics — **not production-ready as-is**

`services/otpService.js`:
- `generateOtp()` — nominally a random 6-digit string.
- `generateAdminOtp()` — **hardcoded, always returns `"111111"`**.
- **Module-level override**: `if (process.env.NODE_ENV !== "production") { generateOtp = () => "111111" }`.
  Since `NODE_ENV` is not set in `.env`, this override is active by default —
  regular user OTP is *also* fixed to `"111111"` unless `NODE_ENV=production`
  is explicitly set in the deploy environment.
- **No SMS/email delivery integration exists anywhere.** The OTP is only ever
  returned in the API response body (dev convenience) or logged; there is no
  actual "send" step. The frontend even renders the returned OTP directly in
  the login UI as "Development OTP".

Treat this as a known gap, not a feature to preserve, if a task involves
hardening auth for production.

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
