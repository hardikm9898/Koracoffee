# Customer Frontend Overview

Path: `front-end/frontend/` · Next.js 16.1.6 (App Router) · React 19.2.3 · TypeScript · Tailwind CSS v4

## Stack

- **Styling**: Tailwind v4 CSS-first config (`@theme` block in `src/app/globals.css`), custom utilities (`glass`, `gradient-text`, `page-shell`). No component library — hand-built markup. `cn()` (`lib/utils.ts`, clsx + tailwind-merge) for conditional classes.
- **State**: no Redux/Zustand — a single React Context (`context/CartContext.tsx`) for cart + favorites; everything else is local `useState`/`useEffect`. See [state-management.md](state-management.md).
- **Animation**: `framer-motion` used pervasively.
- **Backend calls**: plain `fetch()`, no axios/SWR/React Query. Base URL:
  `process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api"` —
  this exact line is duplicated independently in 7 files (no shared API client
  module). `.env.example` documents `NEXT_PUBLIC_API_BASE_URL`; no real `.env`
  is committed (expected) — production deploys must still set it explicitly
  or the app silently targets localhost.
- Images: `next/image` with `remotePatterns` for `images.unsplash.com`,
  `localhost:5000`, `127.0.0.1:5000`; several places use raw `<img>` instead
  (banner slider, review images) inconsistently.

## Routing

See [routing.md](routing.md) for the full page table. No `/checkout/success` —
order confirmation is an inline state within `/checkout` itself. No admin
routes live here (separate app).

## Auth

Phone+OTP, JWT stored in `localStorage` (no cookies). See [authentication.md](authentication.md)
and [feature-flows/authentication-flow.md](feature-flows/authentication-flow.md).

## Cart

Entirely backend-persisted (not localStorage) — guest carts keyed by a
generated session ID, merged into the user's cart on login. See
[feature-flows/cart-flow.md](feature-flows/cart-flow.md).

## Notable gaps / things NOT implemented

- **Favorites are not persisted** — in-memory Context state only, lost on
  refresh, despite a dedicated `/favorites` page and Navbar badge.
- **Payment step in checkout is a static visual mockup** — no gateway
  integration (no Stripe/Razorpay SDK), despite UI copy claiming otherwise.
- **`/subscribe` flow is entirely simulated** (`setTimeout`, no backend call).
- **Coupons are hardcoded client-side** in checkout/profile, not validated
  server-side against a real coupon system (none exists).
- **`components/quiz/CoffeeQuiz.tsx`** is fully built but not rendered
  anywhere — dead code / unlaunched feature.
- A large "Command Center" hero block in `/profile` (avatar, taste radar,
  loyalty points) is present in source but fully commented out.
- Stray root-level files unrelated to the Next.js app: `bg_remover.py`
  (Python image-processing script), `tmp_line.txt` (scratch file),
  `update_data.js` (obsolete data-patching script referencing a pre-migration
  file layout). Safe to ignore unless a task specifically concerns them.

Full details in [known-limitations.md](known-limitations.md).

## Where to look next

- Page-by-page map → [routing.md](routing.md)
- Cart/auth/favorites state mechanics → [state-management.md](state-management.md)
- Shared UI (Navbar, Footer, home components) → [shared-components.md](shared-components.md)
- Per-feature detail → [feature-flows/](feature-flows/)
