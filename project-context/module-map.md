# Module Map

Which file is responsible for what, and what depends on what. For full field
lists see [database.md](database.md); for full routes see [api-reference.md](api-reference.md).

## Backend: model → service → controller → route

| Resource | Model(s) | Service | Controller | Public route file | Admin route file |
|---|---|---|---|---|---|
| Auth | `User` | `otpService`, `tokenService` | `authController` | `authRoutes` | (same file, `/admin/*` paths) |
| Users/Addresses | `User`, `Address` | `addressService` | `userController` | `userRoutes` | `adminUserController` reads `User`+`Address`+`Order` directly |
| Products | `Product`, `Category`, `Review` (rating agg) | — | `productController` | `productRoutes` | `adminProductRoutes` (reuses `productController`) |
| Categories | `Category` | — | `categoryController` | `categoryRoutes` | `adminCategoryRoutes` (reuses `categoryController`) |
| Cart | `Cart` | `cartService` | `cartController` | `cartRoutes` | — (no admin cart view) |
| Orders | `Order`, `Product` (stock) | `cartService` (post-order cleanup) | `orderController` | `orderRoutes` | `adminOrderRoutes` (reuses `orderController`) |
| Reviews | `Review`, `Product` (existence check) | — | `reviewController` (create/list) | `reviewRoutes` | `adminReviewController` (approve/delete/list) — separate file |
| Uploads | — | — | `uploadController` | `uploadRoutes` | `adminUploadRoutes`/`adminCategoryUploadRoutes` (reuse `uploadController`) |
| Bulk product import | `Product`, `Category` | — | `adminBulkProductController` | — | `adminProductRoutes` (`/bulk-upload`) |
| Analytics | `Order`, `Product`, `User` | — | `adminAnalyticsController` | — | `adminAnalyticsRoutes` |

**Key insight**: "admin" vs "public" is a routing/middleware distinction, not
a controller distinction, for products/categories/orders/uploads — the same
function runs either way. See [authentication.md](authentication.md) and
[known-limitations.md](known-limitations.md) for why this matters (public
routers for these resources have no auth on mutating verbs).

## Backend cross-cutting

| File | Used by |
|---|---|
| `middlewares/authMiddleware.js` (`protect`, `requireAdmin`) | every route file except fully-public GET-only ones |
| `utils/asyncHandler.js` | wraps nearly every controller function |
| `utils/ApiError.js` | thrown throughout controllers/middleware for expected errors |
| `utils/adminAuth.js` (`isAdminPhoneNumber`) | `authMiddleware`, `authController` |
| `middlewares/errorHandler.js`, `notFound.js` | registered once in `app.js`, apply globally |

## Customer frontend: page → lib/context dependency

| Page/Component | Depends on |
|---|---|
| `context/CartContext.tsx` | `lib/auth.ts` (`getGuestSessionId`, `getStoredSession`, `getVerifiedAuthToken`) |
| `Navbar.tsx`, `cart/page.tsx`, `checkout/page.tsx`, `favorites/page.tsx`, `ShopClient.tsx`, `ProductDetailClient.tsx` | `context/CartContext.tsx` (`useCart`/`useAppContext`) |
| `login/page.tsx`, `profile/page.tsx`, `checkout/page.tsx`, `Navbar.tsx` | `lib/auth.ts` |
| `cart/page.tsx`, `offers/page.tsx`, `CoffeeQuiz.tsx` | `lib/data.ts` (re-export shim over `product-api.ts` + static `VARIANTS`) |
| `app/page.tsx`, `shop/[id]/page.tsx`, `ShopClient.tsx`, `ProductDetailClient.tsx` | `lib/product-api.ts` directly |
| `ProductDetailClient.tsx` | `lib/review-api.ts` |
| `checkout/page.tsx` | `lib/order-api.ts` (create), `lib/user-api.ts` (addresses) |
| `profile/page.tsx` | `lib/order-api.ts` (history), `lib/user-api.ts` (profile + addresses) |

## Admin frontend: page → lib dependency

| Page | Depends on |
|---|---|
| `app/page.tsx` (dashboard) | `lib/admin-data.ts` → `lib/admin-analytics-api.ts`; `SalesOverviewCard`, `RecentActivitiesCard` (self-fetch independently) |
| `login/page.tsx` | `lib/admin-auth.ts` |
| `products/*` pages, `ProductForm.tsx` | `lib/admin-product-api.ts` |
| `categories/page.tsx` | `lib/admin-product-api.ts` (category functions live here) |
| `orders/*` pages | `lib/admin-order-api.ts` |
| `customers/*` pages | `lib/admin-user-api.ts`, `lib/admin-data.ts` (static segments) |
| `reviews/page.tsx` | `lib/admin-review-api.ts` |
| `settings/page.tsx` | `lib/admin-data.ts` (static `settingsGroups` only, no API) |
| every `lib/admin-*-api.ts` except `admin-auth.ts` | `lib/admin-api.ts` (`adminFetch`) |
| `AdminSidebar.tsx` | `lib/admin-auth.ts` (`logoutAdmin`) |
| `src/proxy.ts` | standalone — no imports from `lib/`, runs at Next.js middleware layer |

## Dead / unused code worth knowing about before "why isn't this used" surprises

- Backend: `Order.itemStatus` field (schema only, never read/written); `auth_token` cookie fallback in `authMiddleware` (nothing ever sets it).
- Customer frontend: `components/quiz/CoffeeQuiz.tsx` (not imported anywhere); commented-out "Command Center" block in `profile/page.tsx`.
- Admin frontend: `getCurrentAdmin()`, `getProductInventory()`/`getProductInventoryData`, `advanceOrderStatus()`, `getUserById()`, `updateUser()`, `deleteUser()` — all exported from their respective `lib/admin-*-api.ts` but never called from any page.
