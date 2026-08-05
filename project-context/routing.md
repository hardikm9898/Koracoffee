# Routing

## Backend API prefixes

All mounted under `/api` in `backend/src/app.js`. See [api-reference.md](api-reference.md)
for the full endpoint list. Prefixes: `/auth`, `/users`, `/cart`, `/products`,
`/categories`, `/orders`, `/reviews`, `/admin/analytics`, `/admin/products`,
`/admin/categories`, `/admin/orders`, `/admin/reviews`, `/admin/users`.

## Customer frontend — `front-end/frontend/src/app/`

| URL | File | Type | Purpose |
|---|---|---|---|
| `/` | `page.tsx` | Server | Home: hero slider, categories, new arrivals, promos |
| `/about` | `about/page.tsx` | Client | Static brand story |
| `/shop` | `shop/page.tsx` → `shop/ShopClient.tsx` | Server wrapper / Client | Product listing, search/filter/sort, infinite scroll |
| `/shop/[id]` | `shop/[id]/page.tsx` → `components/shop/ProductDetailClient.tsx` | Server / Client | Product detail, variants, reviews. Also redirects legacy category slugs (`espresso`, `single-origin`, `equipment`) to `/shop?category=` |
| `/cart` | `cart/page.tsx` | Client | Cart view, upsell banner, order summary |
| `/checkout` | `checkout/page.tsx` | Client | 3-step checkout wizard (redirects to `/login` if unauthenticated) |
| `/login` | `login/page.tsx` | Client | Phone+OTP login/signup |
| `/profile` | `profile/page.tsx` | Client | Order history, addresses, coupons (static), settings (placeholder) |
| `/favorites` | `favorites/page.tsx` | Client | In-memory favorites list |
| `/offers` | `offers/page.tsx` | Client | Marketing offers, product highlights |
| `/subscribe` | `subscribe/page.tsx` | Client | Subscription wizard (simulated, no backend) |
| `/contact`, `/faq`, `/privacy`, `/shipping`, `/terms` | respective `page.tsx` | Client/Server | Static content pages |

Root `layout.tsx` wraps everything in `AppProvider` (cart/favorites context) + persistent `Navbar`/`Footer`.

## Admin frontend — `front-end/admin-frontend/src/app/`

| URL | File | Type | Purpose |
|---|---|---|---|
| `/` | `page.tsx` | Client | Dashboard: stats, revenue chart, channels, fulfillment queue, activity feed |
| `/login` | `login/page.tsx` | Client | Admin phone+OTP login |
| `/products` | `products/page.tsx` | Client | Product list, filters, delete |
| `/products/new` | `products/new/page.tsx` | Server wrapper → `ProductForm` | Create product |
| `/products/[productId]` | `products/[productId]/page.tsx` | Server | Read-only product detail |
| `/products/[productId]/edit` | `products/[productId]/edit/page.tsx` | Server wrapper → `ProductForm` | Edit product |
| `/products/bulk-upload` | `products/bulk-upload/page.tsx` | Client | CSV bulk upload, dry-run preview |
| `/categories` | `categories/page.tsx` | Client | Category CRUD |
| `/orders` | `orders/page.tsx` | Client | Order list, status update, cancel/refund reason capture |
| `/orders/[orderId]` | `orders/[orderId]/page.tsx` | Server | Read-only order detail (no 404 guard) |
| `/customers` | `customers/page.tsx` | Client | Paginated customer list, segment cards |
| `/customers/[userId]` | `customers/[userId]/page.tsx` | Client | Customer order history/spend |
| `/reviews` | `reviews/page.tsx` | Client | Review moderation (pending/approved tabs) |
| `/settings` | `settings/page.tsx` | Server | Static, non-functional |

Root `layout.tsx` wraps everything in `AdminAppShell` (sidebar+main, or centered login layout).

## Route protection mechanism

- **Customer app**: no middleware-level route guard. Individual pages
  (`/checkout`, `/profile`) self-check `getStoredSession()`/token in
  `useEffect` and `router.replace('/login?returnTo=...')` if absent.
- **Admin app**: `src/proxy.ts` (Next.js middleware) guards **all** routes
  except `/login` — redirects to `/login?next=<path>` if no `admin_token`
  cookie found; redirects away from `/login` if a token is found. Does not
  verify token validity, only presence.
