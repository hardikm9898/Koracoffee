# Coding Patterns

Conventions actually used in this codebase — follow these for consistency
unless a task is specifically about fixing the inconsistency.

## Backend

### Controller shape

```
exports.someAction = asyncHandler(async (req, res) => {
  // hand-rolled validation, throws ApiError(status, message) on failure
  // Mongoose query/mutation
  res.json({ success: true, data: ... });
});
```

- `asyncHandler` (`utils/asyncHandler.js`) wraps almost every controller —
  forwards rejected promises to `next(err)` so no try/catch boilerplate is needed.
- `ApiError(statusCode, message)` (`utils/ApiError.js`) is the standard way to
  fail a request with a specific status; caught by `errorHandler` middleware.
- No validation library — every controller hand-rolls checks (`String(x||"").trim()`,
  manual regex for phone/zip, manual enum checks). Expect to see the same
  validation pattern re-typed slightly differently in different files (e.g.
  zip regex differs between `userController` and `orderController`).
- Response envelope is always `{ success: bool, message?, data }` — the
  frontends' `parseResponse()` helpers assume this shape.

### Admin vs public routes

Where both exist for a resource (products, categories, orders, uploads), the
admin route file mounts the **same controller functions** as the public
route file, just with `protect + requireAdmin` applied via `router.use(...)`
at the top of the admin route file. Don't assume "admin controller" implies
different logic — check the public equivalent first.

### File uploads

`multer` config (storage engine, filename sanitizer, mimetype filter) is
copy-pasted per route file rather than shared. Filenames:
`<Date.now()>-<sanitized-original-name>`. If adding a new upload endpoint,
follow the existing pattern in `uploadRoutes.js`/`adminCategoryUploadRoutes.js`
rather than introducing a new approach — but consider extracting a shared
module if touching more than one of these files in the same task.

### IDs

Business-facing entities (`Product`, `Order`) use an auto-incrementing
**numeric** ID (`productId`, `orderId`, found via `max existing + 1`) separate
from the Mongo `_id`. Downstream references (`Cart.items[].productId`,
`Order.items[].productId`, `Review.productId`) use this numeric ID, not
ObjectId — do not switch these to `_id` without a full migration plan.

## Frontend (both apps)

### API client pattern

Every `lib/*-api.ts` file follows this shape (hand-rolled per file, not
shared — see [known-limitations.md](known-limitations.md)):

```ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || "API request failed");
  return payload.data as T;
}

export async function someCall(...) {
  const response = await fetch(`${API_BASE_URL}/resource`, {
    method: "...",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(...),
    cache: "no-store",
  });
  return parseResponse<T>(response);
}
```

- File uploads switch to `FormData` bodies with no manual `Content-Type`
  (browser sets the multipart boundary).
- Admin app centralizes this into `adminFetch()` (`lib/admin-api.ts`) that
  individual `lib/admin-*-api.ts` files call — closer to a real shared client
  than the customer app, which has no shared wrapper at all.
- When adding a new API call: **follow the existing file's local pattern**
  (copy the nearest sibling function) rather than introducing a new
  abstraction — the codebase does not have a central client to extend.

### Component conventions

- `"use client"` directive at the top of any component using hooks/state/effects;
  plain (server) components for static content pages.
- Tailwind utility classes directly in JSX; `cn()` for conditional merging.
- `framer-motion`'s `motion.div`/`AnimatePresence` for animation, often via
  the reusable `ScrollAnimation` wrapper (customer app) for viewport-triggered effects.
- No CSS Modules, no styled-components.

### Forms

Hand-rolled `useState` per field + a `validate()` function returning an
errors object; no form library (no react-hook-form/Formik) in either app.
