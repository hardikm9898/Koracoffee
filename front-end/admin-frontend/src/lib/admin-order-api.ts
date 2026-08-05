import { adminFetch } from "@/lib/admin-api";

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

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "API request failed");
  }
  return payload.data as T;
};

export async function getOrders(): Promise<AdminOrderRecord[]> {
  const response = await adminFetch(`/admin/orders`, {
    cache: "no-store",
  });
  return parseResponse<AdminOrderRecord[]>(response);
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
  return parseResponse<AdminOrderRecord>(response);
}

export async function getOrderById(orderId: number): Promise<AdminOrderRecord> {
  const response = await adminFetch(`/admin/orders/${orderId}`, {
    cache: "no-store",
  });
  return parseResponse<AdminOrderRecord>(response);
}

export async function advanceOrderStatus(
  orderId: number,
): Promise<AdminOrderRecord> {
  const response = await adminFetch(`/admin/orders/${orderId}/advance`, {
    method: "POST",
  });
  return parseResponse<AdminOrderRecord>(response);
}
