import { adminFetch, parseAdminResponse } from "./admin-api";
import type { Pagination } from "./admin-inventory-api";

export const EXPENSE_CATEGORIES = [
  "shipping",
  "labour",
  "rent",
  "utilities",
  "marketing",
  "platform_fees",
  "misc",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type AdminExpense = {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  vendor: string;
  reference: string;
  paymentMethod: string;
  notes: string;
  order: string | null;
  adminPhone: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseInput = {
  category: ExpenseCategory;
  amount: number;
  date?: string;
  vendor?: string;
  reference?: string;
  paymentMethod?: string;
  notes?: string;
};

export async function getExpenses(
  filters: { category?: ExpenseCategory; dateFrom?: string; dateTo?: string; page?: number; limit?: number } = {},
): Promise<{ items: AdminExpense[]; totalAmount: number; pagination: Pagination }> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  const qs = query.toString();

  const response = await adminFetch(`/admin/expenses${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  return parseAdminResponse<{ items: AdminExpense[]; totalAmount: number; pagination: Pagination }>(response);
}

export async function createExpense(input: ExpenseInput): Promise<AdminExpense> {
  const response = await adminFetch(`/admin/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseAdminResponse<AdminExpense>(response);
}

export async function updateExpense(id: string, input: Partial<ExpenseInput>): Promise<AdminExpense> {
  const response = await adminFetch(`/admin/expenses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseAdminResponse<AdminExpense>(response);
}

export async function deleteExpense(id: string): Promise<{ id: string }> {
  const response = await adminFetch(`/admin/expenses/${id}`, { method: "DELETE" });
  return parseAdminResponse<{ id: string }>(response);
}
