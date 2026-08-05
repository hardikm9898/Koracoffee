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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "API request failed");
  }
  return payload.data as T;
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
  return parseResponse<CouponValidationResult>(response);
}

export async function getActiveCoupons(): Promise<CouponRecord[]> {
  const response = await fetch(`${API_BASE_URL}/coupons`, {
    cache: "no-store",
  });
  return parseResponse<CouponRecord[]>(response);
}
