import { adminFetch, parseAdminResponse } from "./admin-api";
import type { Pagination } from "./admin-inventory-api";

export const PURCHASE_STATUSES = ["draft", "confirmed", "cancelled"] as const;
export const PAYMENT_STATUSES = ["unpaid", "partial", "paid"] as const;

export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type AdminPurchaseLine = {
  item: string;
  itemName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitCost: number;
  taxAmount: number;
  discountAmount: number;
  lineTotal: number;
};

export type AdminPurchase = {
  id: string;
  purchaseId: number;
  purchaseNumber: string;
  supplier: { id: string; name: string | null } | null;
  purchaseDate: string;
  items: AdminPurchaseLine[];
  subtotal: number;
  tax: number;
  discount: number;
  shippingCost: number;
  otherCost: number;
  total: number;
  paymentStatus: PaymentStatus;
  status: PurchaseStatus;
  confirmedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseLineInput = {
  itemId: number;
  quantity: number;
  unitCost: number;
  taxAmount?: number;
  discountAmount?: number;
};

export type CreatePurchaseInput = {
  supplier: string;
  purchaseDate?: string;
  items: PurchaseLineInput[];
  shippingCost?: number;
  otherCost?: number;
  notes?: string;
};

export async function getPurchases(
  filters: { status?: PurchaseStatus; paymentStatus?: PaymentStatus; supplier?: string; page?: number; limit?: number } = {},
): Promise<{ items: AdminPurchase[]; pagination: Pagination }> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  const qs = query.toString();

  const response = await adminFetch(`/admin/purchases${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  return parseAdminResponse<{ items: AdminPurchase[]; pagination: Pagination }>(response);
}

export async function createPurchase(input: CreatePurchaseInput): Promise<AdminPurchase> {
  const response = await adminFetch(`/admin/purchases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseAdminResponse<AdminPurchase>(response);
}

export async function updatePurchase(
  purchaseId: number,
  input: Partial<CreatePurchaseInput> & { paymentStatus?: PaymentStatus },
): Promise<AdminPurchase> {
  const response = await adminFetch(`/admin/purchases/${purchaseId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseAdminResponse<AdminPurchase>(response);
}

export async function confirmPurchase(purchaseId: number): Promise<AdminPurchase> {
  const response = await adminFetch(`/admin/purchases/${purchaseId}/confirm`, { method: "POST" });
  return parseAdminResponse<AdminPurchase>(response);
}

export async function cancelPurchase(purchaseId: number): Promise<AdminPurchase> {
  const response = await adminFetch(`/admin/purchases/${purchaseId}/cancel`, { method: "POST" });
  return parseAdminResponse<AdminPurchase>(response);
}
