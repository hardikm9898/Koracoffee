import { adminFetch, parseAdminResponse } from "@/lib/admin-api";

export type AdminAuditLogEntry = {
  id: string;
  adminPhone: string;
  method: string;
  path: string;
  statusCode: number;
  success: boolean;
  createdAt: string;
};

export type AdminAuditLogResponse = {
  items: AdminAuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};

export async function getAuditLog(params: { page?: number; limit?: number } = {}): Promise<AdminAuditLogResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();

  const response = await adminFetch(`/admin/audit-log${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  return parseAdminResponse<AdminAuditLogResponse>(response);
}
