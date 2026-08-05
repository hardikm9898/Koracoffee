# Product Catalog Flow

## Purpose

Let customers browse, search, filter, sort, and view coffee products,
including variants, flavor stats, and approved reviews.

## Entry Point

- `front-end/frontend/src/app/shop/page.tsx` (listing)
- `front-end/frontend/src/app/shop/[id]/page.tsx` (detail)
- `front-end/frontend/src/app/page.tsx` (home page "New Arrivals"/category teasers)

## Related APIs

- `GET /api/products?page&limit&category&search&sort&inStock&minPrice&maxPrice`
- `GET /api/products/:productId`
- `GET /api/categories`
- `GET /api/reviews?productId=&limit=` (reviews shown on detail page)

## Related Controllers

`productController.js` (`listProducts`, `getProductById`), `categoryController.js` (`listCategories`)

## Related Services

None directly — `productController` does its own aggregation for review
summaries (`Review.aggregate` grouped by `productId`, avoids N+1).

## Related Models

`Product`, `Category` (ref), `Review` (for rating aggregation, matched by numeric `productId`)

## Frontend Pages

- `app/shop/page.tsx` → `app/shop/ShopClient.tsx` (client: search/filter/sort/infinite scroll via `IntersectionObserver`, all filtering done server-side per request, not client-side)
- `app/shop/[id]/page.tsx` → `components/shop/ProductDetailClient.tsx` (variant selector, image gallery auto-rotate, add-to-cart, reviews)
- `app/page.tsx` (home) fetches 3 newest products + categories, with `.catch()` fallbacks so a backend outage doesn't crash the home page

## Admin Pages

Not part of this flow directly — see [admin-product-management-flow.md](admin-product-management-flow.md) for how the underlying data is created/edited.

## Database Tables

`products`, `categories`, `reviews` (read-only here)

## Important Business Rules

- `SORT_MAP` supports: `featured`, `best-selling` (by `rating`), `name-asc/desc`,
  `price-asc/desc`, `date-old/new` (proxied by `productId` order).
- Image fallback: `images[0]` used as primary display image if `images[]` is
  populated, else falls back to the legacy single `image` field (and vice
  versa — `images[]` is synthesized from `image` if empty).
- Text search is a case-insensitive regex OR across `name`, `notes`, `origin`
  — no text index, full collection scan at scale.
- `GET /api/products` and `GET /api/categories` are cached in-process for
  30s/60s respectively (`utils/cache.js`), cleared on every write through
  the admin API — see [known-limitations.md](../known-limitations.md) #45.
- `/shop/[id]` also redirects legacy category-slug URLs (`/shop/espresso`,
  `/shop/single-origin`, `/shop/equipment` — used by Footer links) to
  `/shop?category=<Name>` via a small hardcoded slug map.
- If a product has no `variants[]`, the frontend falls back to a shared
  static `VARIANTS` constant (100g/250g/500g with price multipliers) from
  `lib/data.ts` rather than treating it as variant-less.

## Dependencies

- [cart-flow.md](cart-flow.md) — add-to-cart is initiated from both listing and detail pages
- [review-flow.md](review-flow.md) — review display + submission lives on the detail page

## Files Involved

```
backend/src/controllers/productController.js
backend/src/controllers/categoryController.js
backend/src/routes/productRoutes.js
backend/src/routes/categoryRoutes.js
backend/src/models/Product.js
backend/src/models/Category.js
front-end/frontend/src/app/shop/page.tsx
front-end/frontend/src/app/shop/ShopClient.tsx
front-end/frontend/src/app/shop/[id]/page.tsx
front-end/frontend/src/components/shop/ProductDetailClient.tsx
front-end/frontend/src/lib/product-api.ts
front-end/frontend/src/lib/data.ts
```

## Common Mistakes

- Assuming `/api/products` list/detail routes require auth — they don't.
  Mutations (create/update/delete) now require admin auth and only exist
  under `/api/admin/products*` — the public router is GET-only.
- Assuming shop filters are client-side — they trigger a fresh `GET /api/products`
  request on every change; there's no local filtering of an already-fetched set.
- Forgetting the `limit ≤ 30` cap on `GET /api/products` when building any
  "fetch everything" logic (several unrelated features misuse `limit:100` —
  see [known-limitations.md](../known-limitations.md) #(cart/offers/quiz notes)).

## Future Extension Points

- Add a real text index (`$text`) or search service if catalog size grows
  past what a regex scan can handle.
- URL-sync the shop page's non-category filters (search/sort/price/stock) for
  shareable/bookmarkable filtered views — currently only `category` is synced.
