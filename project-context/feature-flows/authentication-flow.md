# Authentication Flow

## Purpose

Identify and authenticate customers and admins using phone number + OTP
(no passwords). Powers login/signup for the storefront and gated access to
the admin dashboard.

## Entry Point

- Customer: `front-end/frontend/src/app/login/page.tsx`
- Admin: `front-end/admin-frontend/src/app/login/page.tsx`

## Related APIs

- `POST /api/auth/request-otp`, `POST /api/auth/verify-otp` (customer)
- `POST /api/auth/admin/request-otp`, `POST /api/auth/admin/verify-otp`,
  `GET /api/auth/admin/me`, `POST /api/auth/admin/logout` (admin)

Full request/response shapes: [api-reference.md](../api-reference.md).

## Related Controllers

`backend/src/controllers/authController.js` (`requestOtp`, `verifyOtp`,
`requestAdminOtp`, `verifyAdminOtp`, `getCurrentAdmin`, `logoutAdmin`)

## Related Services

- `otpService.js` — `generateOtp`, `generateAdminOtp` (fixed `"111111"`), `getOtpExpiryDate`
- `tokenService.js` — `generateToken(payload)` (JWT sign, `JWT_SECRET`, `JWT_EXPIRES_IN` or `"7d"`)
- `addressService.js` — used by `verifyOtp`'s response to attach the user's addresses

## Related Models

`User` (`otpCode`, `otpExpiresAt`, `isVerified`, `lastLoginAt`, `phoneNumber`) — no `isAdmin` field.

## Frontend Pages

- Customer: `app/login/page.tsx` (2-step form), consumed via `lib/auth.ts`
- Uses: `Navbar.tsx` (auth-conditional UI), `checkout/page.tsx` and
  `profile/page.tsx` (redirect-if-logged-out gates)

## Admin Pages

- `app/login/page.tsx`, gated globally by `src/proxy.ts` middleware
- `AdminSidebar.tsx` logout button

## Database Tables

`User` collection only. Admin-ness is **not** stored in the DB — see below.

## Important Business Rules

- Phone must normalize to exactly 10 digits; OTP must be exactly 6 digits.
- OTP is single-use: cleared from `User` on successful verify.
- **Admin identity is config, not data**: a phone must appear in the
  `ADMIN_PHONE_NUMBERS` env var to request/verify an admin OTP, and
  `authMiddleware.protect` re-derives `req.userIsAdmin` on every request from
  this same allowlist OR the JWT's `isAdmin` claim (whichever is true) —
  editing the env var takes effect immediately, even for already-issued tokens.
- Customer JWT: bearer-only, returned in body, no cookie.
- Admin JWT: returned in body **and** set as an httpOnly cookie (`admin_token`).
- OTP is always randomly generated now (no more fixed `"111111"`). There is
  still no real SMS/email delivery provider wired in — `services/otpSender.js`
  intentionally throws in production until one is added. See [authentication.md](../authentication.md).

## Dependencies

- `cartService`/`CartContext` — cart re-attaches on login (`attach-session`), see [cart-flow.md](cart-flow.md)
- `addressService` — verify-otp response includes addresses

## Files Involved

```
backend/src/controllers/authController.js
backend/src/routes/authRoutes.js
backend/src/services/otpService.js
backend/src/services/tokenService.js
backend/src/middlewares/authMiddleware.js
backend/src/utils/adminAuth.js
front-end/frontend/src/app/login/page.tsx
front-end/frontend/src/lib/auth.ts
front-end/admin-frontend/src/app/login/page.tsx
front-end/admin-frontend/src/lib/admin-auth.ts
front-end/admin-frontend/src/proxy.ts
```

## Common Mistakes

- Assuming admin status lives on the `User` document — it doesn't; check
  `ADMIN_PHONE_NUMBERS` and `authMiddleware.js` instead.
- Assuming `getAuthToken()` (customer) means "user is logged in" — it only
  means "a token exists in localStorage", not that it's still valid; use
  `getVerifiedAuthToken()` when correctness matters.
- Assuming the admin app's `admin_token` cookie is httpOnly and JS-inaccessible
  — the frontend itself also sets a JS-writable cookie of the same name; both
  the backend's httpOnly cookie and the frontend's own cookie can be in play.
- Assuming OTP delivery works in production — it doesn't yet;
  `otpSender.js` throws until a real provider is configured there.

## Future Extension Points

- Add a real `isAdmin`/`role` field to `User` if admin permissions need to
  become granular (currently binary, env-config-driven).
- Wire a real SMS/WhatsApp provider into `services/otpSender.js` before any
  production launch — this is the one remaining blocker in this flow.
- Add refresh tokens / token revocation if session lifetime needs to be
  managed beyond the JWT's fixed expiry.
