import { adminFetch, parseAdminResponse } from "./admin-api";

export type AdminSupplier = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  paymentTerms: string;
  active: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export async function getSuppliers(filters: { active?: boolean; search?: string } = {}): Promise<AdminSupplier[]> {
  const query = new URLSearchParams();
  if (filters.active !== undefined) query.set("active", String(filters.active));
  if (filters.search) query.set("search", filters.search);
  const qs = query.toString();

  const response = await adminFetch(`/admin/suppliers${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  return parseAdminResponse<AdminSupplier[]>(response);
}

export type SupplierInput = Partial<
  Pick<AdminSupplier, "name" | "contactName" | "phone" | "email" | "address" | "gstNumber" | "paymentTerms" | "active" | "notes">
>;

export async function createSupplier(input: SupplierInput): Promise<AdminSupplier> {
  const response = await adminFetch(`/admin/suppliers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseAdminResponse<AdminSupplier>(response);
}

export async function updateSupplier(supplierId: string, input: SupplierInput): Promise<AdminSupplier> {
  const response = await adminFetch(`/admin/suppliers/${supplierId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseAdminResponse<AdminSupplier>(response);
}

export async function deleteSupplier(supplierId: string): Promise<{ id: string }> {
  const response = await adminFetch(`/admin/suppliers/${supplierId}`, {
    method: "DELETE",
  });
  return parseAdminResponse<{ id: string }>(response);
}
