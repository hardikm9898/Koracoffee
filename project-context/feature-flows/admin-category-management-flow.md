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

All `protect + requireAdmin`. (Identical CRUD also reachable with **no auth**
via `/api/categories*` — see [known-limitations.md](../known-limitations.md) #1.)

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
- **Deleting a category does not check for existing `Product.category`
  references** — orphaned refs are possible; a product pointing to a deleted
  category will show a blank/null category after `populate`.

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

- Assuming deleting a category is safe/blocked if products reference it — it isn't blocked.
- Looking for `admin-category-api.ts` — category functions live in `admin-product-api.ts`.

## Future Extension Points

- Add a referential-integrity check (block delete, or cascade-null the
  product's category) before allowing category deletion.
- Extract category functions into their own `lib/admin-category-api.ts` for
  consistency with orders/users/reviews, if touching this file for other reasons.
