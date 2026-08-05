# API Reference

Base path: `/api` (mounted in `backend/src/app.js`). All responses follow the
envelope `{ success, message?, data }` (errors: `{ success:false, message }`).
"Auth" column: `—` = no middleware, `user` = `protect`, `admin` = `protect + requireAdmin`.

`GET /api/health` → `{ success:true, message:"Backend is running" }` (no auth).

## Auth — `/api/auth` (`authRoutes.js` → `authController.js`)

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/request-otp` | — | `{name, phoneNumber}` | creates/updates User, returns `otp` if not production |
| POST | `/verify-otp` | — | `{phoneNumber, otp, name?}` | returns `{token, user}`, no cookie |
| POST | `/admin/request-otp` | — | `{phoneNumber, name?}` | 403 if phone not in `ADMIN_PHONE_NUMBERS` |
| POST | `/admin/verify-otp` | — | `{phoneNumber, otp}` | sets `admin_token` httpOnly cookie + returns token in body |
| GET | `/admin/me` | admin | — | sanitized admin user |
| POST | `/admin/logout` | — | — | clears `admin_token` cookie |

## Users — `/api/users` (`userRoutes.js` → `userController.js`), all `user` auth

| Method | Path | Notes |
|---|---|---|
| GET | `/me` | current user |
| GET | `/me/addresses` | list (from `Address` collection, lazy-migrates legacy embedded ones) |
| POST | `/me/addresses` | create; auto-default if first address |
| PATCH | `/me/addresses/:addressId` | scoped to owner |
| DELETE | `/me/addresses/:addressId` | auto-promotes another to default if needed |

## Cart — `/api/cart` (`cartRoutes.js` → `cartController.js`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | guest, via `sessionId` (body/query/`x-session-id` header) |
| POST | `/items` | — | guest add |
| PATCH | `/items` | — | guest update qty |
| DELETE | `/items` | — | guest remove |
| POST | `/clear` | — | guest clear |
| POST | `/attach-session` | user | merges guest cart (by `sessionId`) into user cart, deletes guest cart |
| GET | `/me` | user | same as `/` but for logged-in user |
| POST | `/me/items` | user | add |
| PATCH | `/me/items` | user | update qty |
| DELETE | `/me/items` | user | remove |
| POST | `/me/clear` | user | clear |

## Products — `/api/products` (`productRoutes.js` → `productController.js`) — **read-only**

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | filters: `page,limit(≤30),category,search,inStock,minPrice,maxPrice,sort` |
| GET | `/:productId` | — | numeric productId |

Create/update/delete were removed from this router (they had no auth at all
— see [known-limitations.md](known-limitations.md) #1, now resolved). All
product mutations live exclusively under `/api/admin/products*` (`admin` auth).

`POST /api/products/upload-image` (`uploadRoutes.js`) — **— (no auth)**, `multer.array("images",10)`, 2MB/file, png/jpeg/webp. Still unauthenticated — tracked as [known-limitations.md](known-limitations.md) #3.

## Categories — `/api/categories` (`categoryRoutes.js` → `categoryController.js`) — **read-only**

| Method | Path | Auth |
|---|---|---|
| GET | `/` | — |

Create/update/delete were removed from this router — see product note above. Mutations live under `/api/admin/categories*` (`admin` auth).

## Orders — `/api/orders` (`orderRoutes.js` → `orderController.js`)

All routes require `user` auth (`protect`). `listOrders`/`getOrderById` are
scoped to the requesting user (`Order.user`) unless the caller is an admin.
Status mutation is **not** exposed on this router at all — only via
`/api/admin/orders` (see below).

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/?page=&limit=(≤100)&status=&search=` | user | paginated; own orders only (all orders if caller is admin); returns `{items, pagination, summary}` |
| GET | `/:orderId` | user | own order only (any order if caller is admin) |
| POST | `/` | user | creates order (stamps `Order.user = req.user._id`), atomically reserves stock per item, clears ordered items from cart |

## Reviews — `/api/reviews` (`reviewRoutes.js` → `reviewController.js`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/?productId=` | — | approved only, `limit` 1–50 (default 20), no pagination |
| POST | `/` | — | multipart, `multer.array("images",4)`, always created `status:"pending"` |

## Admin Analytics — `/api/admin/analytics` (all `admin` auth)

| Method | Path | Notes |
|---|---|---|
| GET | `/overview` | ⚠ status-casing bug, ⚠ nonexistent `userId` field aggregation always empty |
| GET | `/revenue-series` | last 7 days, ⚠ same status-casing bug |
| GET | `/channels` | **100% hardcoded mock data** |
| GET | `/fulfillment-queue` | ⚠ status values don't match schema enum — always returns `[]` |
| GET | `/inventory` | ⚠ likely throws (`.slice()` on ObjectId); stock/sellThrough numbers are `Math.random()` |
| GET | `/sales-overview?period=daily\|weekly\|monthly` | correctly implemented, real aggregation |
| GET | `/recent-activities?limit=&lowStockThreshold=` | real: merges recent orders + signups + low-stock alerts |

See [admin-dashboard-analytics-flow.md](feature-flows/admin-dashboard-analytics-flow.md) for detail.

## Admin Products — `/api/admin/products` (all `admin` auth)

| Method | Path | Notes |
|---|---|---|
| POST | `/bulk-upload?dryRun=&mode=create\|upsert` | CSV, `multer.memoryStorage`, 2MB, max 500 rows |
| GET | `/` | same as public list |
| GET | `/:productId` | |
| POST | `/` | create |
| PATCH | `/:productId` | update |
| DELETE | `/:productId` | delete |
| POST | `/upload-image` | (`adminUploadRoutes.js`) multer.array("images",10) |

## Admin Categories — `/api/admin/categories` (all `admin` auth)

Same CRUD shape as public categories, plus `POST /upload-image` (`adminCategoryUploadRoutes.js`, `multer.single("image")`).

## Admin Orders — `/api/admin/orders` (all `admin` auth)

Reuses `orderController`'s `listOrders` (`GET /?page=&limit=&status=&search=`,
unscoped here since `req.userIsAdmin` is true — returns every matching
order, not just the caller's own), `getOrderById` (also unscoped), plus
`updateOrderStatus` (PATCH) and `advanceOrderStatus` (POST
`:orderId/advance`) — **these two status-mutation endpoints are only
reachable through this admin router**, not the public `/api/orders` router.

## Admin Reviews — `/api/admin/reviews` (all `admin` auth)

| Method | Path | Notes |
|---|---|---|
| GET | `/?page=&limit=&status=&productId=` | default `status=pending` |
| PATCH | `/:reviewId/approve` | |
| DELETE | `/:reviewId` | acts as "reject" — no separate rejected state exists |

## Admin Users — `/api/admin/users` (all `admin` auth)

| Method | Path | Notes |
|---|---|---|
| GET | `/?page=&limit=&search=` | search by name/phone |
| GET | `/:userId` | |
| GET | `/:userId/orders?limit=` | ⚠ matched via `shipping.phone === User.phoneNumber` string equality, not a real FK |
| PATCH | `/:userId` | fields: `name, phoneNumber, isVerified` |
| DELETE | `/:userId` | |

## Static files

`GET /uploads/{products,categories,reviews}/<filename>` — publicly served, no auth, from `backend/src/public/uploads/`.
