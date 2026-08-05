import { API_BASE_URL, parseApiResponse } from "./api-client";

export type CouponRecord = {
  code: string;
  type: "percent" | "flat" | "shipping";
  value: number;
  label: string;
  minOrderAmount: number;
  expiresAt: string | null;
};

export type CouponValidationResult = {
  code: string;
  label: string;
  type: "percent" | "flat" | "shipping";
  discountAmount: number;
};

// Coupons used to be a hardcoded object duplicated in this app (checkout
// and profile pages) and, separately, in the backend — with different math
// in each place. Both hardcoded copies are gone now; this is the only
// client-side coupon logic left, and it's just a preview: the backend
// (services/couponService.js) is authoritative at actual order-creation
// time, using the exact same calculation this preview calls.
export async function validateCoupon(
  code: string,
  subtotal: number,
): Promise<CouponValidationResult> {
  const params = new URLSearchParams({ code, subtotal: String(subtotal) });
  const response = await fetch(`${API_BASE_URL}/coupons/validate?${params.toString()}`, {
    cache: "no-store",
  });
  return parseApiResponse<CouponValidationResult>(response);
}

export async function getActiveCoupons(): Promise<CouponRecord[]> {
  const response = await fetch(`${API_BASE_URL}/coupons`, {
    cache: "no-store",
  });
  return parseApiResponse<CouponRecord[]>(response);
}
