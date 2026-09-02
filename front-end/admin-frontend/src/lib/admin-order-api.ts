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
  paymentGateway?: string;
  paymentStatus?: string;
  shiprocketShipmentId?: number | null;
  awbCode?: string | null;
  courierName?: string | null;
  trackingStatus?: string;
  labelUrl?: string | null;
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

// Books the order with Shiprocket (create order, assign AWB, request
// pickup) and moves it to "Shipped" — see backend/src/controllers/shippingController.js.
export async function shipOrder(
  orderId: number,
): Promise<AdminOrderRecord & { pickupScheduled: boolean }> {
  const response = await adminFetch(`/admin/orders/${orderId}/ship`, {
    method: "POST",
  });
  return parseAdminResponse<AdminOrderRecord & { pickupScheduled: boolean }>(response);
}

export async function getShippingLabel(orderId: number): Promise<{ labelUrl: string }> {
  const response = await adminFetch(`/admin/orders/${orderId}/label`, {
    method: "POST",
  });
  return parseAdminResponse<{ labelUrl: string }>(response);
}

export type PackingSlipItem = {
  productId: number;
  name: string;
  variant: string;
  quantity: number;
  image: string | null;
  packagingChecklist: { name: string; quantity: number; unit: string }[];
};

export type PackingSlip = {
  orderId: number;
  orderCode: string;
  status: string;
  createdAt: string;
  shipping: {
    name: string;
    address: string;
    apartment?: string;
    city: string;
    state: string;
    country: string;
    zip: string;
    phone: string;
  };
  items: PackingSlipItem[];
};

// Deliberately no cost/price fields anywhere in this response — see
// orderController.getPackingSlip. This is meant to be printed and taped to
// a box, not just viewed by an admin.
export async function getPackingSlip(orderId: number): Promise<PackingSlip> {
  const response = await adminFetch(`/admin/orders/${orderId}/packing-slip`, {
    cache: "no-store",
  });
  return parseAdminResponse<PackingSlip>(response);
}
