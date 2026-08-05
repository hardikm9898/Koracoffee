# Admin Product Management Flow

## Purpose

Let admins create, edit, delete, and bulk-import products, including images,
variants, flavor stats, and brew guide info.

## Entry Point

`front-end/admin-frontend/src/app/products/page.tsx`

## Related APIs

- `GET /api/admin/products` (list, filters: `category,search,inStock,sort,page,limit`)
- `GET /api/admin/products/:productId`
- `POST /api/admin/products` (create)
- `PATCH /api/admin/products/:productId` (update, supports partial payload)
- `DELETE /api/admin/products/:productId`
- `POST /api/admin/products/upload-image` (multipart, up to 10 images, 2MB each)
- `POST /api/admin/products/bulk-upload?dryRun=&mode=create|upsert` (CSV import)

All `protect + requireAdmin`. (Note: identical CRUD is also reachable with
**no auth** via `/api/products*` — see [known-limitations.md](../known-limitations.md) #1.)

## Related Controllers

`productController.js` (`listProducts`, `getProductById`, `createProduct`, `updateProduct`, `deleteProduct`), `adminBulkProductController.js` (`bulkUploadProducts`), `uploadController.js` (`uploadProductImage`)

## Related Services

None — controllers query `Product`/`Category` directly.

## Related Models

`Product`, `Category` (validated as an existing ref on create/update)

## Frontend Pages

- `app/products/page.tsx` — list, client-side-computed summary cards
  (total/out-of-stock/featured — computed from the current page only, not a
  true aggregate), filters, delete action
- `app/products/new/page.tsx`, `app/products/[productId]/edit/page.tsx` → both render `components/admin/ProductForm.tsx`
- `app/products/[productId]/page.tsx` — read-only detail (has a `notFound()` guard)
- `app/products/bulk-upload/page.tsx` — CSV upload with dry-run preview + client-generated template download

## Admin Pages

This entire flow is admin-only; no customer-facing pages create/edit products.

## Database Tables

`products`, `categories` (lookup only)

## Important Business Rules

- `productId` auto-increments (`max existing + 1`) if omitted on create;
  explicit `productId` collisions return `409`.
- `buildProductPayload` validates `variants[]` (label/price/discountPrice ≤
  price/non-negative stock), category must resolve to an existing `Category`
  ObjectId, rating must be 0–5. Supports `partial` mode for PATCH.
- Deleting a product is a **hard delete with no cascade** — related `Review`
  documents (which reference it by numeric `productId`, not an ObjectId ref)
  become orphaned.
- **Bulk CSV import** (`adminBulkProductController.js`): hand-rolled CSV
  parser (no external library), required headers `name, category, baseprice,
  notes, description, origin` (case/underscore-insensitive), optional
  `originalprice, instock, rating, featured, productid, altitude, process,
  variantattribute, variants` (variants column is a JSON array string).
  `category` column accepts either an ObjectId or a category name (looked up
  case-insensitively). Max 500 rows per file, 2MB cap. `mode=create` fails
  rows whose `productId` already exists; `mode=upsert` updates them in place.
  `dryRun=true` validates/previews without writing. Per-row failures don't
  abort the batch — response includes per-row `status` + a summary.
  Product **name uniqueness is intentionally not enforced**.
- `ProductForm.tsx` combines newly-uploaded image URLs (from
  `uploadProductImages`) with any existing/manual image URL into a deduped
  `images[]` array; the first entry becomes the primary `image`.

## Dependencies

- [product-catalog-flow.md](product-catalog-flow.md) — this flow is the write side of the same `Product` data the storefront reads
- [admin-category-management-flow.md](admin-category-management-flow.md) — category must exist before a product can reference it

## Files Involved

```
backend/src/controllers/productController.js
backend/src/controllers/adminBulkProductController.js
backend/src/controllers/uploadController.js
backend/src/routes/adminProductRoutes.js
backend/src/routes/adminUploadRoutes.js
backend/src/models/Product.js
front-end/admin-frontend/src/app/products/**
front-end/admin-frontend/src/components/admin/ProductForm.tsx
front-end/admin-frontend/src/lib/admin-product-api.ts
```

## Common Mistakes

- Assuming the admin product list's summary cards (total/out-of-stock/featured)
  are true collection-wide totals — they're computed from only the current
  page of results.
- Assuming CSV bulk upload validates product name uniqueness — it explicitly does not.
- Forgetting that deleting a product leaves orphaned `Review` rows behind.
- Assuming `/api/products*` (no `/admin` prefix) is read-only from the admin's
  perspective — it has full unauthenticated CRUD too; don't build new admin
  features against the public router by mistake.

## Future Extension Points

- Add cascade handling (or a soft-delete) for products with existing reviews/orders.
- Enforce name uniqueness in bulk upload if duplicate listings become a real problem.
- Compute list-page summary stats via a real aggregate instead of the current page's `items`.
