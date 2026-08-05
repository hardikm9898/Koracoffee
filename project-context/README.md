# Project Context — Aura Coffee E-Commerce Platform

This folder is a lightweight, hand-maintained knowledge base for the coffee-shop
e-commerce system. It exists so future coding tasks can be done by reading a few
markdown files instead of scanning the entire repository.

## What this project is

A 3-app coffee e-commerce system, all sharing one MongoDB database via one backend API:

| App | Path | Stack | Purpose |
|---|---|---|---|
| **Backend API** | `backend/` | Node.js, Express 4, Mongoose 8, JWT | REST API, business logic, DB access |
| **Customer storefront** | `front-end/frontend/` | Next.js 16 (App Router), React 19, Tailwind v4 | Public shop: browse, cart, checkout, profile |
| **Admin dashboard** | `front-end/admin-frontend/` | Next.js 16 (App Router), React 19, Tailwind v4 | Internal tool: products, orders, customers, reviews, analytics |

Brand name in the UI: **Aura Coffee**. Auth is phone-number + OTP based (no
passwords, no email login) for both customers and admins.

## How to use this context system (read this first)

1. **Always consult this folder before reading source code.** Start with the file
   most relevant to your task (see map below).
2. **Read only what's relevant.** A cart bug only needs [cart-flow.md](feature-flows/cart-flow.md)
   (+ maybe [database.md](database.md) and [api-reference.md](api-reference.md)) — not the whole set.
3. **Open real source files only for implementation details** (exact line-level logic),
   once you already know *which* file to open from these docs.
4. **Do not re-derive architecture that's already documented here.** Trust these
   docs for structure, routes, models, and known issues; verify against source
   only when about to change behavior these docs describe.
5. **Keep this folder in sync.** If a task changes a route, model, flow, or fixes
   a listed limitation, update the relevant `.md` file(s) as part of that task —
   do not let this documentation drift from the code.

## File map — which doc to read for what

| Question | Read |
|---|---|
| "What does this whole system do?" | This file, then [feature-list.md](feature-list.md) |
| "How is the backend structured?" | [backend-overview.md](backend-overview.md) |
| "How is the customer site structured?" | [frontend-overview.md](frontend-overview.md) |
| "How is the admin dashboard structured?" | [admin-overview.md](admin-overview.md) |
| "What DB collections/fields exist?" | [database.md](database.md) |
| "How does login/OTP/admin-auth work?" | [authentication.md](authentication.md) |
| "What's the exact API endpoint for X?" | [api-reference.md](api-reference.md) |
| "What pages/URLs exist in each app?" | [routing.md](routing.md) |
| "How is client-side state (cart, auth, favorites) managed?" | [state-management.md](state-management.md) |
| "Where do files live physically?" | [folder-structure.md](folder-structure.md) |
| "What conventions does the code follow?" | [coding-patterns.md](coding-patterns.md) |
| "What reusable UI components exist?" | [shared-components.md](shared-components.md) |
| "Which controller/service/model touches feature X?" | [module-map.md](module-map.md) |
| "What bugs/risks/tech debt already exist?" | [known-limitations.md](known-limitations.md) — **check before 'fixing' something that might be a known issue** |
| "How does feature X work end-to-end (API → DB → UI)?" | [feature-flows/](feature-flows/) — one file per feature |

## Feature flows

Each file in [feature-flows/](feature-flows/) documents one business feature end-to-end
(purpose, entry point, APIs, controllers, services, models, frontend/admin pages,
DB tables, business rules, dependencies, files involved, common mistakes, extension points):

- [authentication-flow.md](feature-flows/authentication-flow.md) — phone+OTP login for customers and admins
- [product-catalog-flow.md](feature-flows/product-catalog-flow.md) — browsing, search, filter, product detail
- [cart-flow.md](feature-flows/cart-flow.md) — guest + logged-in cart, session merge
- [checkout-order-flow.md](feature-flows/checkout-order-flow.md) — checkout wizard, order creation, coupons, order status
- [review-flow.md](feature-flows/review-flow.md) — customer review submission + moderation queue
- [user-profile-address-flow.md](feature-flows/user-profile-address-flow.md) — profile, saved addresses, order history
- [admin-dashboard-analytics-flow.md](feature-flows/admin-dashboard-analytics-flow.md) — admin overview stats, revenue, activity feed
- [admin-product-management-flow.md](feature-flows/admin-product-management-flow.md) — admin product CRUD, image upload, CSV bulk upload
- [admin-category-management-flow.md](feature-flows/admin-category-management-flow.md) — admin category CRUD
- [admin-order-management-flow.md](feature-flows/admin-order-management-flow.md) — admin order list/status updates/refund
- [admin-customer-management-flow.md](feature-flows/admin-customer-management-flow.md) — admin customer list/detail/order history

## Critical facts every task should know

- **No payment gateway is integrated.** Checkout's "Payment" step is a visual
  mockup only. See [checkout-order-flow.md](feature-flows/checkout-order-flow.md).
- **OTP is not random in non-production environments** — it's hardcoded to
  `"111111"` for both admin and (when `NODE_ENV !== "production"`) regular users.
  See [authentication.md](authentication.md).
- ~~**Several core mutation routes are unauthenticated**~~ **FIXED** (2026-08-05):
  public product/category routers are now GET-only; order status mutation is
  admin-only via `/api/admin/orders`; the public order router requires login
  and scopes results to the caller via a new `Order.user` field. See
  [known-limitations.md](known-limitations.md) and [api-reference.md](api-reference.md).
- **Admin status is not a DB field** — it's computed per-request from a
  `ADMIN_PHONE_NUMBERS` env allowlist. See [authentication.md](authentication.md).
- **Prices are client-trusted** in both cart and order creation; the server
  never re-derives price from `Product`/variant data. See [checkout-order-flow.md](feature-flows/checkout-order-flow.md).
- **Several admin analytics endpoints are broken** (status-enum casing bugs,
  a non-existent `Order.userId` field, hardcoded/mocked data). See
  [admin-dashboard-analytics-flow.md](feature-flows/admin-dashboard-analytics-flow.md).

## Maintenance note

This documentation was generated by reading the full source tree once
(2026-08-05). It is a snapshot, not a live mirror. Before relying on any
specific function/endpoint name for a change (not just background reading),
grep the source to confirm it still exists — see the "Common mistakes" and
"Future extension points" sections in each feature-flow file.
