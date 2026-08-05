import { getAuthToken, getGuestSessionId } from "./auth";

export type OrderItem = {
  productId: number;
  name: string;
  variant: string;
  quantity: number;
  price: number;
  image?: string | null;
};

export type OrderRecord = {
  id: number;
  orderCode: string;
  status: string;
  items: OrderItem[];
  shipping: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zip: string;
  };
  subtotal: number;
  shippingFee: number;
  tax: number;
  total: number;
  eta: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "API request failed");
  }
  return payload.data as T;
};

type OrderListResponse = {
  items: OrderRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean };
};

// The backend now paginates this endpoint (it's shared with the admin order
// list, which needed real pagination to avoid fetching every order in the
// system on every page load — see project-context/known-limitations.md).
// A single customer's own order count is naturally small, so a single
// generous page is enough here rather than building out pager UI.
export async function getOrders(): Promise<OrderRecord[]> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/orders?limit=100`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  const data = await parseResponse<OrderListResponse>(response);
  return data.items;
}

export async function createOrder(order: {
  items: OrderItem[];
  shipping: {
    name: string;
    email: string;
    phone: string;
    address: string;
    apartment?: string;
    company?: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
  couponCode?: string;
  subtotal: number;
  shippingFee: number;
  tax: number;
  total: number;
  notes?: string;
  sessionId?: string;
}): Promise<OrderRecord> {
  const token = getAuthToken();
  const body = {
    ...order,
    sessionId: order.sessionId ?? getGuestSessionId(),
  };

  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return parseResponse<OrderRecord>(response);
}
