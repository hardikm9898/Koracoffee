# Admin Frontend Overview

Path: `front-end/admin-frontend/` · Next.js 16.1.6 (App Router) · React 19.2.3 · TypeScript · Tailwind CSS v4

"Aura Admin" — internal dashboard for managing products, categories,
coupons, orders, customers, and reviews.

## Stack

- **Styling**: Tailwind v4, custom coffee-brand theme tokens, `admin-surface`
  translucent panel style, `lucide-react` icons, `cn()` helper (`lib/utils.ts`).
- **Backend calls**: plain `fetch()` via a shared wrapper `adminFetch`
  (`lib/admin-api.ts`), which all `lib/admin-*-api.ts` modules use except
  `admin-auth.ts` (calls `fetch` directly). Base URL: `NEXT_PUBLIC_API_BASE_URL`
  or `http://localhost:5000/api` — **duplicated identically** in `admin-api.ts`
  and `admin-auth.ts`. `.env.example` documents `NEXT_PUBLIC_API_BASE_URL`; no real `.env` is committed (expected).
- **`src/proxy.ts` is NOT a CORS/API proxy** despite the name — it's Next.js
  middleware that only does auth route-guarding (redirect to `/login` if no
  `admin_token`). The browser calls the backend directly; CORS must be
  configured correctly there.

## Routing

See [routing.md](routing.md). Root layout wraps everything in `AdminAppShell`,
which renders either a centered login layout (`/login`) or sidebar+main layout
(everywhere else) based on `usePathname()`.

## Auth

Phone+OTP (own admin-only endpoints, allowlist-gated). Token lives only in
the backend's httpOnly `admin_token` cookie, matching the login page's copy.
Route protection is `src/proxy.ts` middleware checking for that cookie. See
[authentication.md](authentication.md).

## API client pattern

Every `lib/admin-*-api.ts` file duplicates a local `parseResponse<T>()` helper
expecting envelope `{ data, message? }`; GET requests pass `{ cache: "no-store" }`.
See [coding-patterns.md](coding-patterns.md).

## Notable gaps / risks

- **Settings page (`/settings`) is entirely static** — no backend integration,
  no interactive controls, cannot actually change anything.
- **Dashboard mixes real and fake data with no visual distinction**: stats/
  revenue/channels/fulfillment-queue are real API calls, but "Priority tasks",
  "Segment notes", and "Activity feed" panels are hardcoded arrays in
  `lib/admin-data.ts` styled identically to live panels.
- ~~Customer edit/delete UI doesn't exist~~ **Fixed** — see [known-limitations.md](known-limitations.md) #30.
- ~~Order list has no server-side pagination~~ **Fixed** — real server-side pagination/search/status-filter now, see [known-limitations.md](known-limitations.md) #31.
- **Order detail page has no 404 guard** (`orders/[orderId]/page.tsx`) unlike
  the equivalent products page — a bad order ID likely crashes the page.
- **Refund amounts are estimated client-side** for display, independent of
  whatever the backend actually computes.
- **Dev OTP is echoed into the login UI** ("Dev OTP: ..."), matching the
  backend's non-production OTP behavior — see [authentication.md](authentication.md).
- Sidebar shows a hardcoded placeholder "on duty" admin name, not the actual
  logged-in admin.

Full details in [known-limitations.md](known-limitations.md).

## Where to look next

- Page-by-page map → [routing.md](routing.md)
- Shared UI (AdminAppShell, AdminSidebar, AdminCard, ProductForm) → [shared-components.md](shared-components.md)
- Per-feature detail → [feature-flows/admin-*.md](feature-flows/), [feature-flows/coupon-flow.md](feature-flows/coupon-flow.md)
