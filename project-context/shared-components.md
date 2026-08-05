# Shared Components

## Customer frontend (`front-end/frontend/src/components/`)

| Component | Purpose |
|---|---|
| `layout/Navbar.tsx` | Sticky nav; renders `AnnouncementBar` only on `/`; desktop in-page anchor links + `/shop`; cart badge (`cartCount`), favorites badge (dot if any), auth-conditional profile dropdown (`getStoredSession` + `getVerifiedAuthToken`); mobile drawer menu. Uses two differently-named logo assets (`KAOURA-LOGO.svg` desktop, `koura-logo.png` mobile) — inconsistency, not a bug to "fix" without confirming intent. |
| `layout/Footer.tsx` | Server component; brand blurb + social links (all placeholder `href="#"`), shop/support link columns, non-functional newsletter form (no `onSubmit`). Shop links to `/shop/espresso` etc. route through the `[id]` page's category-slug redirect logic. |
| `home/AnnouncementBar.tsx` | Infinite marquee of 3 promo messages (framer-motion loop). |
| `home/ImageBannerSlider.tsx` | Hero banner, 2 hardcoded slides, auto-advance 3s, pause on hover. |
| `home/DeferredVideo.tsx` | Defers loading a `<video>` by 1.5s (LCP optimization). |
| `home/FloatingCups.tsx` | Purely decorative animated background icons. |
| `home/ScrollAnimation.tsx` | Generic reusable viewport-triggered framer-motion wrapper (`fade-up`/`fade-left`/`fade-right`/`bounce`/`scale-up`), used across many pages. |
| `quiz/CoffeeQuiz.tsx` | Built but **not rendered anywhere** — dead code. A 3-question product-recommendation quiz. |
| `shop/ProductDetailClient.tsx` | Product detail page body: variant selection, image gallery, add-to-cart, reviews list + submission form. Only consumed by `shop/[id]/page.tsx`. |

## Admin frontend (`front-end/admin-frontend/src/components/admin/`)

| Component | Purpose |
|---|---|
| `AdminAppShell.tsx` | Root layout switch: centered layout on `/login`, sidebar+main everywhere else (`usePathname()`-based). |
| `AdminSidebar.tsx` | Nav links (Overview/Orders/Products/Categories/Customers/Reviews/Settings), hardcoded "Shared backend" info block, hardcoded placeholder "on duty" admin card (not the real logged-in user), logout button (`logoutAdmin()`). |
| `AdminTopbar.tsx` | Reusable page header (title, description, badge, optional search input) — used atop nearly every admin page. |
| `AdminCard.tsx` | Reusable rounded panel wrapper (`admin-surface` style) with optional eyebrow+title+`badge` (rendered inline next to the title) — used throughout, **except** `orders/[orderId]/page.tsx` and `products/[productId]/page.tsx`, which use plain markup instead (visual inconsistency). Also exports `SampleDataBadge` — a reusable amber "Sample data" pill for flagging hardcoded/static panels (used on the dashboard and `/customers`), so they're not mistaken for the real, backend-driven panels next to them. |
| `ProductForm.tsx` | Shared create/edit product form: core fields, category dropdown, multi-image upload (client-validates type/size), flavor stats, serve guide, dynamic variants editor. Used by both `products/new` and `products/[productId]/edit`. |
| `SalesOverviewCard.tsx` | Self-fetches `getSalesOverviewData(period)` on period toggle; renders totals + bar chart. |
| `RecentActivitiesCard.tsx` | Self-fetches `getRecentActivitiesData(12)`; client-side tab filter (all/order/customer/stock). |

## Cross-cutting UI facts

- Neither app uses a component library (no shadcn/MUI/Ant) — everything is
  hand-built Tailwind + `lucide-react` icons.
- Both apps have a `lib/utils.ts` exporting `cn()` (clsx + tailwind-merge) as
  their only shared non-visual utility.
- No shared component/package between the customer app and the admin app —
  they are fully independent Next.js projects with duplicated patterns
  (intentional, not a monorepo).
