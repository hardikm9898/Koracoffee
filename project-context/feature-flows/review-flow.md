# Review Flow

## Purpose

Let customers submit product reviews (with photos), which go into a
moderation queue; only admin-approved reviews are shown publicly.

## Entry Point

- Submission: `front-end/frontend/src/components/shop/ProductDetailClient.tsx` (review form on `/shop/[id]`)
- Moderation: `front-end/admin-frontend/src/app/reviews/page.tsx`

## Related APIs

- `GET /api/reviews?productId=&limit=` (public, approved only)
- `POST /api/reviews` (public, multipart with images, always `status:"pending"`)
- `GET /api/admin/reviews?page=&limit=&status=&productId=` (admin, default `status=pending`)
- `PATCH /api/admin/reviews/:reviewId/approve`
- `DELETE /api/admin/reviews/:reviewId`

## Related Controllers

`reviewController.js` (`listApprovedReviews`, `createReview`), `adminReviewController.js` (`getAdminReviews`, `approveReview`, `deleteReview`)

## Related Services

None — controllers query `Review`/`Product` directly.

## Related Models

`Review` (`status` enum `pending`/`approved` only — **no "rejected" state**), `Product` (existence check on submit)

## Frontend Pages

`components/shop/ProductDetailClient.tsx` — displays `avgRating`/`reviewCount`
+ approved review list, plus a submission form (name, optional phone, 1–5
rating, content, up to 4 images) with a "will appear after approval" notice.

## Admin Pages

`app/reviews/page.tsx` — two tabs (Pending/Approved), approve button (pending
only), delete button (both — delete is how "reject" works, since there's no
separate rejected state), shows product **ID** not product name (no join),
truncated content, up to 2 thumbnail images + overflow count.

## Database Tables

`reviews`

## Important Business Rules

- Every submitted review starts as `status:"pending"` — nothing is auto-approved.
- Reviews can be submitted by guests — `reviewRoutes.js` applies no `protect`
  middleware, so `req.user` is effectively always `undefined` even if a
  logged-in user submits one; the review's `user` ref will be `null` in practice.
- Moderation is binary: **approve** or **delete**. There's no reject-with-reason
  or edit-and-republish flow.
- `listApprovedReviews` requires a numeric `productId` and returns at most
  `limit` (1–50, default 20) items with no true pagination (`skip`) — always
  "latest N", not "page N".
- Review images: up to 4 per review, `multer.array("images", 4)`, 2MB/file,
  png/jpeg/webp only, saved to `public/uploads/reviews/`.
- Product's aggregate `rating`/review count shown on the catalog and detail
  pages is computed live via `Review.aggregate` (matched on `status:"approved"`)
  — not a denormalized field on `Product`.

## Dependencies

- [product-catalog-flow.md](product-catalog-flow.md) — reviews are matched to products by numeric `productId`, and product list/detail responses embed the aggregate rating

## Files Involved

```
backend/src/controllers/reviewController.js
backend/src/controllers/adminReviewController.js
backend/src/routes/reviewRoutes.js
backend/src/routes/adminReviewRoutes.js
backend/src/models/Review.js
front-end/frontend/src/components/shop/ProductDetailClient.tsx
front-end/frontend/src/lib/review-api.ts
front-end/admin-frontend/src/app/reviews/page.tsx
front-end/admin-frontend/src/lib/admin-review-api.ts
```

## Common Mistakes

- Assuming there's a "rejected" review state to filter/query — there isn't;
  rejection = deletion.
- Assuming review submission requires login — it doesn't (public endpoint).
- Assuming the admin review table shows product names — it shows the raw
  numeric `productId`, no lookup/join is performed.

## Future Extension Points

- Join product name into the admin review list (single extra `Product.find`
  by the set of `productId`s on the page) for a better moderation UX.
- Add a genuine "rejected" status with a reason, distinct from hard delete, if
  an audit trail of moderation decisions becomes necessary.
- Add real pagination (`skip`/`page`) to the public review list endpoint.
