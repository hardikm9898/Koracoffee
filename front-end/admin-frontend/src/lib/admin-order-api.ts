import { adminFetch, parseAdminResponse } from "@/lib/admin-api";

export type AdminOrderItem = {
  productId: number;
  name: string;
  variant: string;
  quantity: number;
  price: number;
  image?: string | null;
};

export type AdminItemStatus = {
  productId: number;
  status: string;
  cancelledBy?: "admin" | "user";
  cancelReason?: string;
  refundedAmount?: number;
};

export type AdminOrderRecord = {
  id: number;
  orderCode: string;
  status: string;
  items: AdminOrderItem[];
  itemStatus?: AdminItemStatus[];
  shipping: {
    name: string;
    email: string;
    phone: string;
    address: string;
    apartment?: string;
    company?: string;
    city: string;
    state?: string;
    country?: string;
    zip: string;
  };
  subtotal: number;
  shippingFee: number;
  tax: number;
  total: number;
  couponCode?: string;
  discountAmount?: number;
  discountLabel?: string;
  eta: string;
  notes?: string;
  paymentMethod?: string;
  cancelReason?: string;
  refundReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrderPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
};

export type AdminOrderSummary = {
  averageOrderValue: number;
  pendingProcessing: number;
  dispatchRate: number;
};

export type AdminOrderListResponse = {
  items: AdminOrderRecord[];
  pagination: AdminOrderPagination;
  summary: AdminOrderSummary;
};

export async function getOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
} = {}): Promise<AdminOrderListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);

  const queryString = query.toString();
  const response = await adminFetch(`/admin/orders${queryString ? `?${queryString}` : ""}`, {
    cache: "no-store",
  });
  return parseAdminResponse<AdminOrderListResponse>(response);
}

export async function updateOrderStatus(
  orderId: number,
  status: string,
  payload?: { cancelReason?: string; refundReason?: string },
): Promise<AdminOrderRecord> {
  const body = { status, ...(payload || {}) };
  const response = await adminFetch(`/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseAdminResponse<AdminOrderRecord>(response);
}

export async function getOrderById(orderId: number): Promise<AdminOrderRecord> {
  const response = await adminFetch(`/admin/orders/${orderId}`, {
    cache: "no-store",
  });
  return parseAdminResponse<AdminOrderRecord>(response);
}

export async function advanceOrderStatus(
  orderId: number,
): Promise<AdminOrderRecord> {
  const response = await adminFetch(`/admin/orders/${orderId}/advance`, {
    method: "POST",
  });
  return parseAdminResponse<AdminOrderRecord>(response);
}
