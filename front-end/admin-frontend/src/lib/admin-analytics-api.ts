import { adminFetch } from "@/lib/admin-api";

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
  stock: number;
  sellThrough: string;
  status: string;
  nextBatch: string;
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

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "API request failed");
  }
  return payload.data as T;
};

export async function getOverviewStats(): Promise<AdminOverviewStat[]> {
  const response = await adminFetch(`/admin/analytics/overview`, {
    cache: "no-store",
  });

  return parseResponse<AdminOverviewStat[]>(response);
}

export async function getRevenueSeries(): Promise<AdminRevenueSeriesItem[]> {
  const response = await adminFetch(`/admin/analytics/revenue-series`, {
    cache: "no-store",
  });

  return parseResponse<AdminRevenueSeriesItem[]>(response);
}

export async function getChannelPerformance(): Promise<AdminChannelPerformance[]> {
  const response = await adminFetch(`/admin/analytics/channels`, {
    cache: "no-store",
  });

  return parseResponse<AdminChannelPerformance[]>(response);
}

export async function getFulfillmentQueue(): Promise<AdminFulfillmentQueueItem[]> {
  const response = await adminFetch(`/admin/analytics/fulfillment-queue`, {
    cache: "no-store",
  });

  return parseResponse<AdminFulfillmentQueueItem[]>(response);
}

export async function getProductInventory(): Promise<AdminProductInventoryItem[]> {
  const response = await adminFetch(`/admin/analytics/inventory`, {
    cache: "no-store",
  });

  return parseResponse<AdminProductInventoryItem[]>(response);
}

export async function getSalesOverview(period: AdminSalesOverviewPeriod = "daily"): Promise<AdminSalesOverview> {
  const response = await adminFetch(`/admin/analytics/sales-overview?period=${encodeURIComponent(period)}`, {
    cache: "no-store",
  });

  return parseResponse<AdminSalesOverview>(response);
}

export async function getRecentActivities(limit = 10): Promise<AdminRecentActivities> {
  const response = await adminFetch(`/admin/analytics/recent-activities?limit=${encodeURIComponent(String(limit))}`, {
    cache: "no-store",
  });

  return parseResponse<AdminRecentActivities>(response);
}
