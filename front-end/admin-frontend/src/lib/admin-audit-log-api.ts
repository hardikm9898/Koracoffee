import { adminFetch } from "@/lib/admin-api";

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

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "API request failed");
  }
  return payload.data as T;
};

export async function getAuditLog(params: { page?: number; limit?: number } = {}): Promise<AdminAuditLogResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();

  const response = await adminFetch(`/admin/audit-log${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  return parseResponse<AdminAuditLogResponse>(response);
}
