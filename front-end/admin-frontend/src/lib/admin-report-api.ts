import { adminFetch, parseAdminResponse } from "./admin-api";

export type ProfitabilityReport = {
  period: { from: string | null; to: string | null };
  orderCount: number;
  grossSales: number;
  discounts: number;
  shippingRevenue: number;
  netSales: number;
  cogs: number;
  cogsByType: Record<string, number>;
  operatingExpenses: number;
  grossProfit: number;
  netProfit: number;
  marginPercent: number;
};

export type ProductCostRow = {
  productId: number;
  productName: string;
  variant: string;
  sellingPrice: number;
  rawMaterialCost: number;
  packagingCost: number;
  totalCogs: number;
  grossProfit: number;
  marginPercent: number;
};

export type PurchaseReport = {
  period: { from: string | null; to: string | null };
  totalValue: number;
  bySupplier: { supplierId: string | null; supplierName: string; purchaseCount: number; totalValue: number }[];
  byItem: { itemId: string | null; itemName: string; sku: string; totalQuantity: number; totalValue: number }[];
};

export async function getProfitabilityReport(filters: { dateFrom?: string; dateTo?: string } = {}): Promise<ProfitabilityReport> {
  const query = new URLSearchParams();
  if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) query.set("dateTo", filters.dateTo);
  const qs = query.toString();

  const response = await adminFetch(`/admin/reports/profitability${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  return parseAdminResponse<ProfitabilityReport>(response);
}

export async function getProductCostReport(): Promise<ProductCostRow[]> {
  const response = await adminFetch(`/admin/reports/product-cost`, { cache: "no-store" });
  return parseAdminResponse<ProductCostRow[]>(response);
}

export async function getPurchaseReport(filters: { dateFrom?: string; dateTo?: string } = {}): Promise<PurchaseReport> {
  const query = new URLSearchParams();
  if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) query.set("dateTo", filters.dateTo);
  const qs = query.toString();

  const response = await adminFetch(`/admin/reports/purchases${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  return parseAdminResponse<PurchaseReport>(response);
}
