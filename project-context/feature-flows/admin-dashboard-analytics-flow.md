# Admin Dashboard / Analytics Flow

## Purpose

Give admins a home-page overview of revenue, order fulfillment, and store
activity. **Partially broken** — read the Business Rules section before
relying on any of these numbers.

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

## Important Business Rules — and known breakage

- **`getSalesOverview` and `getRecentActivities` are correctly implemented**
  and safe to rely on/extend.
- **`getOverviewStats`, `getRevenueSeries`, `getFulfillmentQueue` compare
  `Order.status` against lowercase strings** (`"cancelled"`, `"delivered"`,
  `"completed"`, `"pending"`, `"confirmed"`, `"packing"`, `"ready"`) but the
  real schema enum is capitalized (`Received, Roasting, Packaging, Shipped,
  Delivered, Cancelled, Refunded`) — these comparisons never match, so
  revenue "cancelled" exclusion is a no-op, "orders fulfilled" is always 0,
  and the fulfillment queue is always empty.
- **`getOverviewStats`'s retention-rate calc groups by `Order.$userId`**,
  a field that does not exist on the schema — always returns 0.
- **`getFulfillmentQueue` also `.populate('userId', ...)`** on the same
  nonexistent field — silent no-op.
- **`getProductInventory` likely throws** (`product.category.slice(0,3)` on
  an unpopulated ObjectId) and even its non-throwing fields are
  `Math.random()`-generated fake stock/sell-through numbers, not real data.
- **`getChannelPerformance` is 100% hardcoded mock data** — no real
  channel/attribution tracking exists anywhere in the schema.
- The dashboard's icon-per-stat-card selection is fragile string-matching
  (`stat.title.includes("revenue"/"Orders"/"customers")`) against
  backend-provided copy — a copy change server-side silently breaks icons.

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

- Trusting `overview`/`revenue-series`/`fulfillment-queue`/`inventory`/`channels`
  numbers as real — several are broken or fully mocked (see above). Before
  building on top of these, fix the underlying status-casing bug first.
- Assuming "Priority tasks"/"Segment notes"/"Activity feed" panels on the
  dashboard are live data — they're hardcoded arrays with no visual "static"
  indicator.
- Assuming `getProductInventory` works — it likely throws at runtime; verify
  before calling it from anywhere new.

## Future Extension Points

- Fix the status-string casing mismatch (`"cancelled"` → `"Cancelled"`, etc.)
  in `getOverviewStats`, `getRevenueSeries`, `getFulfillmentQueue` — this is
  the single highest-value fix in this flow, unblocking three endpoints at once.
- Add a real `Order.user` ref (see [known-limitations.md](../known-limitations.md) #6)
  so retention-rate aggregation can actually group by customer.
- Replace `getChannelPerformance`'s mock data with real attribution tracking
  if/when a marketing-channel field is added to orders.
- Fix `getProductInventory`'s ObjectId `.slice()` bug and replace its random
  numbers with real variant-stock aggregation (similar to
  `calculateLowStockFromVariants` already used in `getRecentActivities`).
