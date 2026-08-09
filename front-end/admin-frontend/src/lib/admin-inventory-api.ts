import { adminFetch, parseAdminResponse } from "./admin-api";

export const INVENTORY_ITEM_TYPES = ["raw_material", "packaging", "consumable", "other"] as const;
export const INVENTORY_UNITS = ["pcs", "kg", "g", "litre", "ml", "box", "meter", "cm", "other"] as const;
export const LEDGER_TRANSACTION_TYPES = [
  "opening",
  "purchase",
  "consumption",
  "adjustment",
  "damage",
  "wastage",
  "return",
] as const;

export type InventoryItemType = (typeof INVENTORY_ITEM_TYPES)[number];
export type InventoryUnit = (typeof INVENTORY_UNITS)[number];
export type LedgerTransactionType = (typeof LEDGER_TRANSACTION_TYPES)[number];
export type StockStatus = "in_stock" | "low" | "critical" | "out_of_stock";

export type AdminInventoryItem = {
  id: string;
  itemId: number;
  name: string;
  sku: string;
  type: InventoryItemType;
  unit: InventoryUnit;
  currentStock: number;
  minStock: number;
  reorderLevel: number;
  avgCost: number;
  lastPurchaseCost: number;
  stockValue: number;
  status: StockStatus;
  supplier: { id: string; name: string | null } | null;
  active: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminInventoryTransaction = {
  id: string;
  item: { id: string; name: string | null; sku: string | null; unit: string | null } | null;
  type: LedgerTransactionType;
  quantityChange: number;
  beforeStock: number;
  afterStock: number;
  unitCost: number;
  totalCost: number;
  referenceType: "purchase" | "order" | "manual" | "adjustment";
  purchase: string | null;
  order: string | null;
  reason: string;
  adminPhone: string;
  createdAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminInventoryDashboard = {
  totalItems: number;
  totalInventoryValue: number;
  lowStockCount: number;
  criticalStockCount: number;
  outOfStockCount: number;
  lowStockItems: AdminInventoryItem[];
};

export type InventoryItemListFilters = {
  type?: InventoryItemType;
  active?: boolean;
  search?: string;
  stock?: "low" | "critical" | "out";
  page?: number;
  limit?: number;
};

const toQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
};

export async function getInventoryDashboard(): Promise<AdminInventoryDashboard> {
  const response = await adminFetch(`/admin/inventory/dashboard`, { cache: "no-store" });
  return parseAdminResponse<AdminInventoryDashboard>(response);
}

export async function getInventoryItems(
  filters: InventoryItemListFilters = {},
): Promise<{ items: AdminInventoryItem[]; pagination: Pagination }> {
  const response = await adminFetch(`/admin/inventory/items${toQueryString(filters)}`, {
    cache: "no-store",
  });
  return parseAdminResponse<{ items: AdminInventoryItem[]; pagination: Pagination }>(response);
}

export async function getInventoryItem(itemId: number): Promise<AdminInventoryItem> {
  const response = await adminFetch(`/admin/inventory/items/${itemId}`, { cache: "no-store" });
  return parseAdminResponse<AdminInventoryItem>(response);
}

export type CreateInventoryItemInput = {
  name: string;
  sku: string;
  type: InventoryItemType;
  unit: InventoryUnit;
  minStock?: number;
  reorderLevel?: number;
  supplier?: string | null;
  notes?: string;
  openingStock?: number;
  openingCost?: number;
};

export async function createInventoryItem(input: CreateInventoryItemInput): Promise<AdminInventoryItem> {
  const response = await adminFetch(`/admin/inventory/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseAdminResponse<AdminInventoryItem>(response);
}

export type UpdateInventoryItemInput = Partial<
  Pick<CreateInventoryItemInput, "name" | "sku" | "type" | "unit" | "minStock" | "reorderLevel" | "supplier" | "notes"> & {
    active: boolean;
  }
>;

export async function updateInventoryItem(
  itemId: number,
  input: UpdateInventoryItemInput,
): Promise<AdminInventoryItem> {
  const response = await adminFetch(`/admin/inventory/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseAdminResponse<AdminInventoryItem>(response);
}

export async function adjustInventoryStock(
  itemId: number,
  input: { quantityChange: number; reason: string; type?: "adjustment" | "damage" | "wastage" | "return" },
): Promise<{ item: AdminInventoryItem; transaction: AdminInventoryTransaction }> {
  const response = await adminFetch(`/admin/inventory/items/${itemId}/adjust`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseAdminResponse<{ item: AdminInventoryItem; transaction: AdminInventoryTransaction }>(response);
}

export type LedgerFilters = {
  itemId?: number;
  type?: LedgerTransactionType;
  order?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export async function getInventoryLedger(
  filters: LedgerFilters = {},
): Promise<{ items: AdminInventoryTransaction[]; pagination: Pagination }> {
  const response = await adminFetch(`/admin/inventory/ledger${toQueryString(filters)}`, {
    cache: "no-store",
  });
  return parseAdminResponse<{ items: AdminInventoryTransaction[]; pagination: Pagination }>(response);
}
