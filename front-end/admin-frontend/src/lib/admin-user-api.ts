import { adminFetch } from "@/lib/admin-api";

export type AdminUserRecord = {
  id: string;
  name: string;
  phoneNumber: string;
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  addressesCount: number;
};

export type AdminUserListResponse = {
  items: AdminUserRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};

export type AdminUserOrderHistory = {
  user: AdminUserRecord;
  summary: {
    totalOrders: number;
    totalSpend: number;
    avgOrderValue: number;
    avgDaysBetweenOrders: number | null;
    lastOrderAt: string | null;
  };
  orders: Array<{
    id: number;
    orderCode: string;
    status: string;
    total: number;
    createdAt: string;
    updatedAt: string;
    shipping: {
      name: string;
      email: string;
      phone: string;
      address: string;
      city: string;
      state?: string;
      country?: string;
      zip: string;
      apartment?: string;
      company?: string;
    };
    items: Array<{
      productId: number;
      name: string;
      variant: string;
      quantity: number;
      price: number;
      image?: string | null;
    }>;
  }>;
};

type AdminUserQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "API request failed");
  }
  return payload.data as T;
};

const buildQuery = (query: AdminUserQuery) => {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

export async function getUsers(page?: number, limit?: number): Promise<AdminUserListResponse>;
export async function getUsers(query?: AdminUserQuery): Promise<AdminUserListResponse>;
export async function getUsers(
  arg1: number | AdminUserQuery = 1,
  arg2: number = 50,
): Promise<AdminUserListResponse> {
  const query: AdminUserQuery = typeof arg1 === "number" ? { page: arg1, limit: arg2 } : (arg1 ?? {});
  const response = await adminFetch(`/admin/users${buildQuery(query)}`, {
    cache: "no-store",
  });

  return parseResponse<AdminUserListResponse>(response);
}

export async function getUserById(userId: string): Promise<AdminUserRecord> {
  const response = await adminFetch(`/admin/users/${userId}`, {
    cache: "no-store",
  });

  return parseResponse<AdminUserRecord>(response);
}

export async function getUserOrderHistory(userId: string, limit = 50): Promise<AdminUserOrderHistory> {
  const response = await adminFetch(`/admin/users/${userId}/orders?limit=${encodeURIComponent(String(limit))}`, {
    cache: "no-store",
  });

  return parseResponse<AdminUserOrderHistory>(response);
}

export async function updateUser(
  userId: string,
  user: Partial<Pick<AdminUserRecord, "name" | "phoneNumber" | "isVerified">>,
): Promise<AdminUserRecord> {
  const response = await adminFetch(`/admin/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
  });

  return parseResponse<AdminUserRecord>(response);
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await adminFetch(`/admin/users/${userId}`, {
    method: "DELETE",
  });

  await parseResponse<void>(response);
}
