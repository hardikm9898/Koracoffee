# Admin Category Management Flow

## Purpose

Let admins create, edit, activate/deactivate, and delete product categories,
including a category image.

## Entry Point

`front-end/admin-frontend/src/app/categories/page.tsx`

## Related APIs

- `GET /api/admin/categories`
- `POST /api/admin/categories`
- `PATCH /api/admin/categories/:id`
- `DELETE /api/admin/categories/:id`
- `POST /api/admin/categories/upload-image` (multipart, single `image` field)

All `protect + requireAdmin`. The public `/api/categories*` router is
GET-only (mutations were removed — see [known-limitations.md](../known-limitations.md) #1);
these admin routes are the only way to create/update/delete categories.

## Related Controllers

`categoryController.js` (`listCategories`, `createCategory`, `updateCategory`, `deleteCategory`), `uploadController.js` (`uploadCategoryImage`)

## Related Services

None.

## Related Models

`Category`

## Frontend Pages

`app/categories/page.tsx` — summary card (total count + first 3 previews),
"New category" form (name + image upload), full editable table (inline
edit-in-place per row, Save/Cancel, active/inactive toggle via icon, delete).

## Admin Pages

This is an admin-only flow. Note: category CRUD functions live in
`lib/admin-product-api.ts` on the frontend (not a separate
`admin-category-api.ts`) — inconsistent with every other domain having its own file.

## Database Tables

`categories`

## Important Business Rules

- `name` must be unique (case-sensitive exact match); duplicate create/update returns `409`.
- `active` boolean is used purely as a display/filter flag — toggled via
  `PATCH { active: !category.active }` from the same edit form, not a
  separate endpoint.
- **Deleting a category is now blocked (`409`) if any `Product.category`
  still references it** — `deleteCategory` checks `Product.countDocuments`
  first; the error message includes the count. Intentionally a block, not
  a cascade — reassign or delete the referencing products first.

## Dependencies

- [admin-product-management-flow.md](admin-product-management-flow.md) — `ProductForm.tsx`'s category dropdown depends on this collection; `productController.createProduct`/`updateProduct` validate the referenced category exists (at write time only — not retroactively if later deleted)
- [product-catalog-flow.md](product-catalog-flow.md) — storefront category chips/filters read `GET /api/categories`

## Files Involved

```
backend/src/controllers/categoryController.js
backend/src/controllers/uploadController.js
backend/src/routes/adminCategoryRoutes.js
backend/src/routes/adminCategoryUploadRoutes.js
backend/src/models/Category.js
front-end/admin-frontend/src/app/categories/page.tsx
front-end/admin-frontend/src/lib/admin-product-api.ts
```

## Common Mistakes

- Looking for `admin-category-api.ts` — category functions live in `admin-product-api.ts`.

## Future Extension Points

- Extract category functions into their own `lib/admin-category-api.ts` for
  consistency with orders/users/reviews, if touching this file for other reasons.
