# Admin Dashboard / Analytics Flow

## Purpose

Give admins a home-page overview of revenue, order fulfillment, and store
activity. The status-casing bugs that made several endpoints always return
empty/zero results have been fixed (2026-08-05) — read the Business Rules
section for what's real, what was fixed, and what's still intentionally mocked.

## Entry Point

`front-end/admin-frontend/src/app/page.tsx`

## Related APIs

All under `/api/admin/analytics`, all `protect + requireAdmin`:

- `GET /overview`
- `GET /revenue-series`
- `GET /channels`
- `GET /fulfillment-queue`
- `GET /inventory`
- `GET /sales-overview?period=daily|weekly|monthly`
- `GET /recent-activities?limit=&lowStockThreshold=`

## Related Controllers

`adminAnalyticsController.js` (`getOverviewStats`, `getRevenueSeries`, `getChannelPerformance`, `getFulfillmentQueue`, `getProductInventory`, `getSalesOverview`, `getRecentActivities`)

## Related Services

None — controller queries `Order`/`Product`/`User` directly with Mongoose aggregates.

## Related Models

`Order`, `Product`, `User`

## Frontend Pages

`app/page.tsx` — fires `overview`/`revenue-series`/`channels`/`fulfillment-queue`
in parallel via `Promise.all` on mount, plus renders `SalesOverviewCard.tsx`
(self-fetches `sales-overview` on period toggle) and `RecentActivitiesCard.tsx`
(self-fetches `recent-activities`, client-filterable by type). Also renders
three **entirely hardcoded, non-backend** panels styled identically to the
real ones: "Priority tasks", "Segment notes", "Activity feed" (source:
`lib/admin-data.ts`).

## Admin Pages

This *is* the admin page (dashboard/home, `/`).

## Database Tables

`orders`, `products`, `users` (read-only aggregates, no writes)

## Important Business Rules

- **All endpoints except `getChannelPerformance` now return real data** —
  verified live against the dev database on 2026-08-05.
- `getOverviewStats`/`getRevenueSeries` exclude non-revenue orders via
  `{ $nin: NON_REVENUE_STATUSES }` (`["Cancelled","Refunded"]`) — the same
  constant `getSalesOverview` already used. "Orders fulfilled" matches
  `status: "Delivered"` exactly.
- `getOverviewStats`'s retention-rate calc groups by `Order.user` (a real
  ObjectId ref — see [checkout-order-flow.md](checkout-order-flow.md)),
  excluding `user: null` orders (guest/pre-migration) from the count.
- `getFulfillmentQueue` matches `status: { $in: ["Received","Roasting","Packaging","Shipped"] }`
  — orders not yet at a terminal state. `getETA()`'s per-status copy was
  updated to match these real status names.
- `getProductInventory` populates `category` (was previously an unpopulated
  ObjectId, causing a likely runtime crash) and derives `stock`/`status`
  from real `Product.variants[].stock` — `stock` is `null` (not a fake
  number) for products that don't track per-variant stock.
  `sellThrough`/`nextBatch` were removed entirely (no real data source
  existed for them); the admin-frontend `AdminProductInventoryItem` type
  was updated to match.
- **`getChannelPerformance` is still 100% hardcoded mock data** — this is
  not a bug, there is no channel/attribution field anywhere in the schema
  to aggregate from. The code now says so explicitly
  ("INTENTIONALLY MOCKED"). Implementing it for real means adding a
  `source`/UTM field to `Order` and populating it at checkout — a feature,
  not a fix.
- The dashboard's icon-per-stat-card selection is fragile string-matching
  (`stat.title.includes("revenue"/"Orders"/"customers")`) against
  backend-provided copy — a copy change server-side silently breaks icons.
  Not touched by this fix pass.

## Dependencies

Reads across [admin-order-management-flow.md](admin-order-management-flow.md),
[admin-product-management-flow.md](admin-product-management-flow.md), and
[admin-customer-management-flow.md](admin-customer-management-flow.md) domains
without depending on their code (separate aggregate queries).

## Files Involved

```
backend/src/controllers/adminAnalyticsController.js
backend/src/routes/adminAnalyticsRoutes.js
front-end/admin-frontend/src/app/page.tsx
front-end/admin-frontend/src/lib/admin-analytics-api.ts
front-end/admin-frontend/src/lib/admin-data.ts
front-end/admin-frontend/src/components/admin/SalesOverviewCard.tsx
front-end/admin-frontend/src/components/admin/RecentActivitiesCard.tsx
```

## Common Mistakes

- Trusting `channels` (`getChannelPerformance`) as real — it's the one
  endpoint in this flow still intentionally mocked. Everything else here is
  now real.
- Assuming "Priority tasks"/"Segment notes"/"Activity feed" panels on the
  dashboard are live data — they're hardcoded arrays in `lib/admin-data.ts`
  with no visual "static" indicator (unrelated to the backend endpoints
  above; not touched by this fix pass).
- Assuming `getProductInventory`'s `stock` field is always a number — it's
  `null` for products with no `variants[]` defined (true of every seeded
  product), by design (honest "unknown" instead of a fake number).

## Future Extension Points

- Replace `getChannelPerformance`'s mock data with real attribution tracking
  once a marketing-channel/source field is added to `Order`.
- Give `getProductInventory` a real `sellThrough` metric once there's a
  data source for it (e.g. a per-product units-sold aggregate over `Order.items`).
- Label or wire up the dashboard's hardcoded "Priority tasks"/"Segment
  notes"/"Activity feed" panels (see [known-limitations.md](../known-limitations.md) #29).
