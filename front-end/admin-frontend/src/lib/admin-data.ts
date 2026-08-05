import {
  ChartNoAxesCombined,
  BellRing,
  ShieldCheck,
  MessageSquareMore,
} from "lucide-react";

import {
  getOverviewStats,
  getRevenueSeries,
  getChannelPerformance,
  getFulfillmentQueue,
  getProductInventory,
  getSalesOverview,
  getRecentActivities,
  type AdminOverviewStat,
  type AdminRevenueSeriesItem,
  type AdminChannelPerformance,
  type AdminFulfillmentQueueItem,
  type AdminProductInventoryItem,
  type AdminSalesOverview,
  type AdminSalesOverviewPoint,
  type AdminSalesOverviewPeriod,
  type AdminRecentActivities,
  type AdminRecentActivityType,
  type AdminRecentActivityItem,
} from "./admin-analytics-api";

// Re-export types for convenience
export type {
  AdminOverviewStat,
  AdminRevenueSeriesItem,
  AdminChannelPerformance,
  AdminFulfillmentQueueItem,
  AdminProductInventoryItem,
  AdminSalesOverview,
  AdminSalesOverviewPoint,
  AdminSalesOverviewPeriod,
  AdminRecentActivities,
  AdminRecentActivityType,
  AdminRecentActivityItem,
} from "./admin-analytics-api";

// Export API functions
export {
  getOverviewStats,
  getRevenueSeries,
  getChannelPerformance,
  getFulfillmentQueue,
  getProductInventory,
  getSalesOverview,
  getRecentActivities,
};

// Legacy exports for backward compatibility - these will be async functions
export const getAdminOverviewStats = getOverviewStats;
export const getRevenueSeriesData = getRevenueSeries;
export const getChannelPerformanceData = getChannelPerformance;
export const getFulfillmentQueueData = getFulfillmentQueue;
export const getProductInventoryData = getProductInventory;
export const getSalesOverviewData = getSalesOverview;
export const getRecentActivitiesData = getRecentActivities;

export const customerSegments = [
  { name: "Club members", size: "482", spend: "₹124 avg", loyalty: "High", note: "Most responsive to monthly curation drops." },
  { name: "Gift buyers", size: "214", spend: "₹89 avg", loyalty: "Medium", note: "Peak during launches and festive bundles." },
  { name: "Wholesale partners", size: "36", spend: "₹1.8k avg", loyalty: "High", note: "Stable reorder cadence every 12-16 days." },
];

export const teamTasks = [
  { title: "Approve Kenya AA replenishment", owner: "Ops", due: "Today", priority: "High" },
  { title: "Review spring campaign creative", owner: "Marketing", due: "Tomorrow", priority: "Medium" },
  { title: "Verify COD exceptions", owner: "Support", due: "Today", priority: "High" },
  { title: "Refresh SKU photography shortlist", owner: "Brand", due: "Apr 12", priority: "Low" },
];

export const activityFeed = [
  { title: "Subscription churn dropped 2.1%", detail: "Retention win after bundle refresh rollout.", icon: ChartNoAxesCombined, time: "14 minutes ago" },
  { title: "15 high-value carts recovered", detail: "Email flow triggered with 11.8% conversion.", icon: BellRing, time: "32 minutes ago" },
  { title: "2FA enabled for admin team", detail: "Security controls upgraded across all operators.", icon: ShieldCheck, time: "1 hour ago" },
  { title: "Customer satisfaction reached 4.8/5", detail: "Support replies under 6 minutes average.", icon: MessageSquareMore, time: "2 hours ago" },
];

export const settingsGroups = [
  {
    title: "Store operations",
    description: "Tax, shipping windows, payment capture, and refunds.",
    items: ["Auto-capture prepaid orders", "Regional shipping cut-off times", "Order risk review thresholds"],
  },
  {
    title: "Customer experience",
    description: "Notifications, loyalty tiers, and support response policies.",
    items: ["Transactional email branding", "VIP customer routing rules", "Review request automation"],
  },
  {
    title: "Security and access",
    description: "Roles, audit logs, and authentication controls.",
    items: ["Role-based dashboard access", "Mandatory two-factor authentication", "Weekly privileged-access audit"],
  },
];
