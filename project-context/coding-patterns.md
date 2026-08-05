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
  frontends' `parseApiResponse()`/`parseAdminResponse()` helpers assume this
  shape.

### Admin vs public routes

Where both exist for a resource (products, categories, orders, uploads), the
admin route file mounts the **same controller functions** as the public
route file, just with `protect + requireAdmin` applied via `router.use(...)`
at the top of the admin route file. Don't assume "admin controller" implies
different logic — check the public equivalent first.

### File uploads

Disk-based image uploads (`uploadRoutes.js`, `adminUploadRoutes.js`,
`adminCategoryUploadRoutes.js`, `reviewRoutes.js`) share one factory:
`createImageUploader(subdir)` in `utils/imageUpload.js`, which builds the
`diskStorage`/`fileFilter`/`limits`/filename-sanitizer multer instance
(filenames: `<Date.now()>-<sanitized-original-name>`, saved under
`public/uploads/<subdir>`, mimetype rejections throw `ApiError(400, ...)`).
Call it with the target subdir (`"products"` / `"categories"` / `"reviews"`)
rather than hand-rolling a new multer config. `adminProductRoutes.js`'s CSV
bulk-upload uses `memoryStorage` directly — different file type, not part of
this factory, don't route it through `createImageUploader`.

### IDs

Business-facing entities (`Product`, `Order`) use an auto-incrementing
**numeric** ID (`productId`, `orderId`, found via `max existing + 1`) separate
from the Mongo `_id`. Downstream references (`Cart.items[].productId`,
`Order.items[].productId`, `Review.productId`) use this numeric ID, not
ObjectId — do not switch these to `_id` without a full migration plan.

## Frontend (both apps)

### API client pattern

Both apps now share one response-parsing helper per app instead of each
`lib/*-api.ts` file redefining it. Shape:

```ts
export async function someCall(...) {
  const response = await fetch(`${API_BASE_URL}/resource`, {  // or adminFetch(path, ...) on the admin side
    method: "...",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(...),
    cache: "no-store",
  });
  return parseApiResponse<T>(response, "Fallback error message");  // parseAdminResponse<T>(...) on the admin side
}
```

- Customer app: `API_BASE_URL` and `parseApiResponse<T>(response, fallbackMessage?)`
  live in `lib/api-client.ts` — import both from there rather than
  redefining them locally. `fallbackMessage` defaults to `"API request
  failed"` if omitted; pass a more specific one where the original code had
  one.
- Admin app: `adminFetch(path, init)` and `parseAdminResponse<T>(response,
  fallbackMessage?)` both live in `lib/admin-api.ts`. `adminFetch` always
  sends `credentials: "include"` (and forwards cookies on SSR calls) — call
  it instead of raw `fetch` for every admin API request, including auth
  (`lib/admin-auth.ts` used to bypass it for login/logout; it doesn't
  anymore).
- File uploads switch to `FormData` bodies with no manual `Content-Type`
  (browser sets the multipart boundary).
- When adding a new API call: reuse the shared helper, and otherwise follow
  the nearest sibling function's shape in the same file.

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
