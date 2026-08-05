# Folder Structure

## Repo root

```
d:\hardik\coffee\
  backend/                  Express API
  front-end/
    frontend/                Customer storefront (Next.js)
    admin-frontend/          Admin dashboard (Next.js)
  project-context/          This documentation set
```

Not a git repo at the root (no `.git` observed at `d:\hardik\coffee`) — the
three apps are managed as siblings, not a monorepo tool (no Turborepo/Nx/workspaces).

## backend/src/

```
app.js                  Express app + middleware chain
server.js               boot (dotenv, connectDB, listen)
config/db.js            Mongoose connection
models/                 Address, Cart, Category, Order, Product, Review, User
routes/                 authRoutes, userRoutes, cartRoutes, productRoutes,
                         categoryRoutes, orderRoutes, reviewRoutes, uploadRoutes,
                         admin{Analytics,Category,CategoryUpload,Order,Product,
                         Review,Upload,User}Routes
controllers/            authController, userController, cartController,
                         productController, categoryController, orderController,
                         reviewController, uploadController,
                         admin{Analytics,BulkProduct,Review,User}Controller
services/                addressService, cartService, otpService, otpSender,
                         pricingService, tokenService
middlewares/             authMiddleware, errorHandler, notFound, rateLimiters
utils/                  ApiError, adminAuth, asyncHandler
public/uploads/          products/, categories/, reviews/ (served at /uploads)
data/productSeed.js      24 hardcoded coffee products
seeders/seedProducts.js  wipes + reseeds Product/Category
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
components/
  home/                   AnnouncementBar, DeferredVideo, FloatingCups,
                          ImageBannerSlider, ScrollAnimation
  layout/                 Navbar, Footer
  quiz/                   CoffeeQuiz (dead code, not rendered anywhere)
  shop/                   ProductDetailClient
context/CartContext.tsx  cart + favorites global state
lib/                     auth, data, order-api, product-api, review-api,
                         user-api, utils
```

Root-level stray files (not part of the app runtime): `bg_remover.py`,
`tmp_line.txt`, `update_data.js` — see [frontend-overview.md](frontend-overview.md).

## front-end/admin-frontend/src/

```
app/                     Next.js App Router pages — see routing.md
components/admin/        AdminAppShell, AdminCard, AdminSidebar, AdminTopbar,
                         ProductForm, RecentActivitiesCard, SalesOverviewCard
lib/                     admin-analytics-api, admin-api (shared fetch wrapper),
                         admin-auth, admin-data (static/mock content +
                         legacy-named re-exports), admin-order-api,
                         admin-product-api (also holds category CRUD),
                         admin-review-api, admin-user-api, utils
proxy.ts                 Next.js middleware — auth route guard (not a CORS proxy)
```

Note: category CRUD functions live inside `admin-product-api.ts` rather than a
dedicated `admin-category-api.ts` — every other domain has its own file.
