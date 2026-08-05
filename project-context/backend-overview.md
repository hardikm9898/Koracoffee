# Backend Overview

Path: `backend/` · Entry: `src/server.js` · Node.js + Express 4.21.2 + Mongoose 8.12.1

## Stack

- **Framework**: Express 4
- **DB**: MongoDB via Mongoose 8 (`config/db.js`, reads `MONGODB_URI`)
- **Auth**: `jsonwebtoken` 9 (JWT, `services/tokenService.js`)
- **Uploads**: `multer` 1.4.4 (disk storage per resource; memory storage for CSV bulk upload)
- **Logging**: `morgan` ("dev" format only — no persistent/structured logging)
- **CORS**: `cors`, custom origin allowlist from `CLIENT_URL`/`CLIENT_URLS` env vars
- **No** validation library (Joi/Zod/express-validator) — all validation is hand-rolled per controller
- **No** ORM transactions used anywhere (no Mongoose sessions)

package.json scripts: `dev` (nodemon), `start`, `seed:products` (seeds 24 hardcoded coffee products).

## Boot sequence (`server.js` → `app.js`)

1. `dotenv.config()`
2. `connectDB()` (throws if `MONGODB_URI` missing)
3. `app.listen(PORT || 5000)`

## Express middleware chain (exact order, `app.js`)

1. `cors()` — custom origin function, allows if no `Origin` header, no allowlist configured, or origin is in `CLIENT_URL`/`CLIENT_URLS`. `credentials: true`.
2. `express.json()` — **no `express.urlencoded()`**, so form-encoded bodies are never parsed (only JSON and multipart via multer).
3. `morgan("dev")`
4. `express.static(.../public/uploads)` mounted at `/uploads`
5. `GET /api/health`
6. All resource routers (see [api-reference.md](api-reference.md))
7. `notFound` middleware (404 JSON)
8. `errorHandler` middleware (final error handler, no server-side logging of errors)

## Folder layout (see [folder-structure.md](folder-structure.md) for full tree)

```
src/
  app.js, server.js        Express app + boot
  config/db.js             Mongoose connection
  models/                  7 Mongoose schemas
  routes/                  1 file per resource (+ admin-prefixed duplicates)
  controllers/             business logic, one file per resource
  services/                addressService, cartService, otpService, tokenService
  middlewares/              authMiddleware, errorHandler, notFound
  utils/                   ApiError, adminAuth, asyncHandler
  public/uploads/          product/category/review images (served at /uploads)
  data/, seeders/          product seed data + seed script
```

## Key architectural facts

- **Admin is not a DB role.** There's no `isAdmin`/`role` field on `User`. Admin
  status is computed per-request in `authMiddleware.protect` from a phone-number
  allowlist (`ADMIN_PHONE_NUMBERS` env var, checked by `utils/adminAuth.js`).
  See [authentication.md](authentication.md).
- **Admin routes largely reuse the same controllers as public routes.**
  `categoryController`, `productController`, `orderController`, and
  `uploadController`'s functions are literally shared between `/api/products`
  and `/api/admin/products` (etc.) — the only difference is which router applies
  `protect`/`requireAdmin`. Several public routers apply **no** auth at all on
  mutating verbs — see [known-limitations.md](known-limitations.md).
- **Orders are not linked to users by ObjectId.** `Order` has no `user` field;
  admin order history for a customer is matched by comparing `Order.shipping.phone`
  to `User.phoneNumber` as strings. Fragile — see [known-limitations.md](known-limitations.md).
- **Cart/Order prices are client-supplied**, not re-derived from `Product` on
  the server. Only stock (not price) is validated at checkout.
- **Error handling**: every controller uses `asyncHandler` (catches rejected
  promises → `next(err)`) and throws `ApiError(statusCode, message)` for
  expected failures. `errorHandler` middleware turns any error into
  `{ success:false, message }` with `err.statusCode || 500`. No server-side
  error logging exists beyond `morgan`'s request line.
- **File uploads**: multer is configured independently (copy-pasted) in 5
  different route files rather than a shared module. Uploaded files are saved
  under `src/public/uploads/{products,categories,reviews}/` and referenced by
  **absolute URL** (built from `req.protocol`/`req.get("host")`, no `trust proxy`
  configured) stored directly on the DB documents.

## Where to look next

- Full route list with auth requirements → [api-reference.md](api-reference.md)
- All 7 models, fields, relationships → [database.md](database.md)
- Login/OTP/JWT/admin-auth mechanics → [authentication.md](authentication.md)
- Per-feature business rules → [feature-flows/](feature-flows/)
- Bugs and risks found during analysis → [known-limitations.md](known-limitations.md)
