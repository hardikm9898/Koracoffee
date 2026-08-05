import { adminFetch, parseAdminResponse } from "@/lib/admin-api";

export type AdminOverviewStat = {
  title: string;
  value: string;
  delta: string;
  tone: "positive" | "negative" | "warning";
  detail: string;
};

export type AdminRevenueSeriesItem = {
  label: string;
  amount: number;
};

export type AdminChannelPerformance = {
  name: string;
  share: number;
  revenue: string;
  trend: string;
};

export type AdminFulfillmentQueueItem = {
  code: string;
  customer: string;
  items: string;
  total: string;
  status: string;
  eta: string;
};

export type AdminProductInventoryItem = {
  name: string;
  sku: string;
  category: string;
  // null when the product doesn't track per-variant stock (no honest number
  // to report). sellThrough/nextBatch were removed from the backend
  // response — they were Math.random()-generated placeholders with no real
  // data source; re-add only once there's an actual metric to compute.
  stock: number | null;
  status: string;
};

export type AdminSalesOverviewPeriod = "daily" | "weekly" | "monthly";

export type AdminSalesOverviewPoint = {
  label: string;
  revenue: number;
  orders: number;
  sales: number;
};

export type AdminSalesOverview = {
  period: AdminSalesOverviewPeriod | string;
  totals: {
    revenue: number;
    orders: number;
    sales: number;
  };
  series: AdminSalesOverviewPoint[];
};

export type AdminRecentActivityType = "order" | "customer" | "stock";

export type AdminRecentActivityItem = {
  type: AdminRecentActivityType;
  title: string;
  detail: string;
  time: string;
  meta?: Record<string, unknown>;
};

export type AdminRecentActivities = {
  items: AdminRecentActivityItem[];
};

export async function getOverviewStats(): Promise<AdminOverviewStat[]> {
  const response = await adminFetch(`/admin/analytics/overview`, {
    cache: "no-store",
  });

  return parseAdminResponse<AdminOverviewStat[]>(response);
}

export async function getRevenueSeries(): Promise<AdminRevenueSeriesItem[]> {
  const response = await adminFetch(`/admin/analytics/revenue-series`, {
    cache: "no-store",
  });

  return parseAdminResponse<AdminRevenueSeriesItem[]>(response);
}

export async function getChannelPerformance(): Promise<AdminChannelPerformance[]> {
  const response = await adminFetch(`/admin/analytics/channels`, {
    cache: "no-store",
  });

  return parseAdminResponse<AdminChannelPerformance[]>(response);
}

export async function getFulfillmentQueue(): Promise<AdminFulfillmentQueueItem[]> {
  const response = await adminFetch(`/admin/analytics/fulfillment-queue`, {
    cache: "no-store",
  });

  return parseAdminResponse<AdminFulfillmentQueueItem[]>(response);
}

export async function getProductInventory(): Promise<AdminProductInventoryItem[]> {
  const response = await adminFetch(`/admin/analytics/inventory`, {
    cache: "no-store",
  });

  return parseAdminResponse<AdminProductInventoryItem[]>(response);
}

export async function getSalesOverview(period: AdminSalesOverviewPeriod = "daily"): Promise<AdminSalesOverview> {
  const response = await adminFetch(`/admin/analytics/sales-overview?period=${encodeURIComponent(period)}`, {
    cache: "no-store",
  });

  return parseAdminResponse<AdminSalesOverview>(response);
}

export async function getRecentActivities(limit = 10): Promise<AdminRecentActivities> {
  const response = await adminFetch(`/admin/analytics/recent-activities?limit=${encodeURIComponent(String(limit))}`, {
    cache: "no-store",
  });

  return parseAdminResponse<AdminRecentActivities>(response);
}
