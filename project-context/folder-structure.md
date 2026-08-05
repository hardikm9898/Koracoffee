# Folder Structure

## Repo root

```
d:\hardik\coffee\
  .github/workflows/ci.yml  GitHub Actions: backend tests, both frontends' build
  backend/                  Express API
  front-end/
    frontend/                Customer storefront (Next.js)
    admin-frontend/          Admin dashboard (Next.js)
  project-context/          This documentation set
```

A single git repo at the root (initialized 2026-08-05 — previously this
project had no version control at all) covers all three apps plus
`project-context/` together; they are siblings, not a monorepo tool (no
Turborepo/Nx/workspaces). No git remote is configured yet, so CI has never
actually run — see [known-limitations.md](known-limitations.md) #42.

## backend/src/

```
app.js                  Express app + middleware chain
server.js               boot (dotenv, connectDB, listen)
config/db.js            Mongoose connection
models/                 Address, AuditLog, Cart, Category, Coupon, Order,
                         Product, Review, User
routes/                 authRoutes, userRoutes, cartRoutes, productRoutes,
                         categoryRoutes, orderRoutes, reviewRoutes, uploadRoutes,
                         couponRoutes, adminCouponRoutes, adminAuditLogRoutes,
                         admin{Analytics,Category,CategoryUpload,Order,Product,
                         Review,Upload,User}Routes
controllers/            authController, userController, cartController,
                         productController, categoryController, orderController,
                         reviewController, uploadController, couponController,
                         adminCouponController, adminAuditLogController,
                         admin{Analytics,BulkProduct,Review,User}Controller
services/                addressService, cartService, couponService, otpService,
                         otpSender, pricingService, tokenService
middlewares/             authMiddleware, auditLog, errorHandler, notFound, rateLimiters
utils/                  ApiError, adminAuth, asyncHandler, cache (in-process
                         TTL cache — product/category list caching), logger (pino)
public/uploads/          products/, categories/, reviews/ (served at /uploads)
data/productSeed.js      24 hardcoded coffee products
seeders/seedProducts.js  wipes + reseeds Product/Category
seeders/seedCoupons.js   upserts 3 legacy coupon codes (never wipes)
seeders/backfillAddresses.js  one-time: migrates legacy embedded
                         User.addresses[] into Address, then removes the
                         field — already run against the dev DB, safe to
                         re-run (idempotent)
tests/                   jest + supertest integration tests (setup.js,
                         helpers.js, order.test.js, cart.test.js, auth.test.js,
                         coupon.test.js, referentialIntegrity.test.js, cache.test.js)
jest.config.js           jest config (setupFilesAfterEnv → tests/setup.js)
.env                     local secrets (gitignored)
.env.example             documents every env var (MONGODB_URI, JWT_SECRET,
                         JWT_EXPIRES_IN, ADMIN_PHONE_NUMBERS, PORT, NODE_ENV,
                         CLIENT_URL, CLIENT_URLS, OTP_EXPIRY_MINUTES,
                         ADMIN_COOKIE_SAME_SITE, ADMIN_COOKIE_DOMAIN)
```

Admin-prefixed route/controller files (`admin*`) generally **reuse** the
non-admin controller functions where a public equivalent exists (products,
categories, orders, upload) — see [module-map.md](module-map.md).

## front-end/frontend/src/

```
app/                     Next.js App Router pages — see routing.md
  robots.ts               served at /robots.txt
  sitemap.ts               served at /sitemap.xml
components/
  home/                   AnnouncementBar, DeferredVideo, FloatingCups,
                          ImageBannerSlider, ScrollAnimation
  layout/                 Navbar, Footer
  quiz/                   CoffeeQuiz (dead code, not rendered anywhere)
  shop/                   ProductDetailClient
context/CartContext.tsx  cart + favorites (both persisted — cart to the
                         backend, favorites to localStorage) global state
lib/                     auth, coupon-api, data, order-api, product-api,
                         review-api, user-api, utils
```

Root-level stray files (not part of the app runtime): `bg_remover.py`,
`tmp_line.txt`, `update_data.js` — see [frontend-overview.md](frontend-overview.md).

## front-end/admin-frontend/src/

```
app/                     Next.js App Router pages — see routing.md
  coupons/                admin coupon management (list/create/edit/delete)
  audit-log/               read-only view of every admin mutation
components/admin/        AdminAppShell, AdminCard (exports SampleDataBadge),
                         AdminSidebar, AdminTopbar, ProductForm,
                         RecentActivitiesCard, SalesOverviewCard
lib/                     admin-analytics-api, admin-api (shared fetch wrapper),
                         admin-audit-log-api, admin-auth, admin-coupon-api,
                         admin-data (static/mock content + legacy-named
                         re-exports), admin-order-api, admin-product-api
                         (also holds category CRUD), admin-review-api,
                         admin-user-api, utils
proxy.ts                 Next.js middleware — auth route guard (not a CORS proxy)
```

Note: category CRUD functions live inside `admin-product-api.ts` rather than a
dedicated `admin-category-api.ts` — every other domain has its own file.
