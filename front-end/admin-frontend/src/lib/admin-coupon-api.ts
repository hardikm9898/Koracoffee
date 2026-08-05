import { adminFetch } from "@/lib/admin-api";

export type AdminCouponRecord = {
  id: string;
  code: string;
  type: "percent" | "flat" | "shipping";
  value: number;
  label: string;
  active: boolean;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminCouponInput = {
  code: string;
  type: "percent" | "flat" | "shipping";
  value: number;
  label: string;
  active?: boolean;
  minOrderAmount?: number;
  maxUses?: number | null;
  expiresAt?: string | null;
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "API request failed");
  }
  return payload.data as T;
};

export async function getCoupons(): Promise<AdminCouponRecord[]> {
  const response = await adminFetch(`/admin/coupons`, { cache: "no-store" });
  return parseResponse<AdminCouponRecord[]>(response);
}

export async function createCoupon(coupon: AdminCouponInput): Promise<AdminCouponRecord> {
  const response = await adminFetch(`/admin/coupons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(coupon),
  });
  return parseResponse<AdminCouponRecord>(response);
}

export async function updateCoupon(
  couponId: string,
  coupon: Partial<AdminCouponInput>,
): Promise<AdminCouponRecord> {
  const response = await adminFetch(`/admin/coupons/${couponId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(coupon),
  });
  return parseResponse<AdminCouponRecord>(response);
}

export async function deleteCoupon(couponId: string): Promise<void> {
  const response = await adminFetch(`/admin/coupons/${couponId}`, {
    method: "DELETE",
  });
  await parseResponse<void>(response);
}
