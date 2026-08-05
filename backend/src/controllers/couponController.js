const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const Coupon = require("../models/Coupon");
const { resolveCoupon } = require("../services/couponService");

const serializePublicCoupon = (coupon) => ({
  code: coupon.code,
  type: coupon.type,
  value: coupon.value,
  label: coupon.label,
  minOrderAmount: coupon.minOrderAmount,
  expiresAt: coupon.expiresAt,
});

// Lets the frontend preview a discount before checkout without duplicating
// coupon math client-side. This is a preview only — the authoritative
// check happens again in orderController.buildOrderPayload at order
// creation time (same shared couponService.resolveCoupon), so a coupon
// that expires or hits its usage cap between preview and checkout is still
// caught correctly.
const validateCoupon = asyncHandler(async (req, res) => {
  const code = req.query.code ? String(req.query.code) : "";
  const subtotal = Number(req.query.subtotal) || 0;

  if (!code.trim()) {
    throw new ApiError(400, "Coupon code is required");
  }

  // Mirrors orderController.buildOrderPayload's fixed shipping fee / tax
  // formula so the preview matches what checkout will actually charge.
  const shippingFee = 5.0;
  const tax = Math.round(subtotal * 0.08 * 100) / 100;

  const { coupon, error } = await resolveCoupon(code, { subtotal, shippingFee, tax });
  if (!coupon) {
    throw new ApiError(400, error || "Coupon code is invalid or expired");
  }

  res.status(200).json({ success: true, data: coupon });
});

const listActiveCoupons = asyncHandler(async (_req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({
    active: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  }).sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: coupons.map(serializePublicCoupon) });
});

module.exports = { validateCoupon, listActiveCoupons };
