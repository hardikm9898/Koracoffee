const Coupon = require("../models/Coupon");

/**
 * Resolves a coupon code against the database and computes its discount for
 * a given order shape. This is the single source of truth for coupon
 * validation/math — used by both the public preview endpoint
 * (couponController.validateCoupon) and order creation
 * (orderController.buildOrderPayload), so a coupon can never be accepted at
 * checkout with different math than what was previewed.
 *
 * Replaces a previous implementation that hardcoded three coupon codes
 * directly in orderController.js, including a real bug: the percent
 * branch multiplied the order amount by the raw stored value (20 for
 * "20%") instead of value/100, so applying AURA20 always computed a
 * discount ~20x the order total and order creation failed outright
 * ("Total must be a valid positive number") — verified live before this
 * fix. See known-limitations.md.
 */
const resolveCoupon = async (code, { subtotal, shippingFee, tax }) => {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) {
    return { coupon: null, error: null };
  }

  const coupon = await Coupon.findOne({ code: normalized });

  if (!coupon || !coupon.active) {
    return { coupon: null, error: "Coupon code is invalid or expired" };
  }

  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { coupon: null, error: "Coupon code is invalid or expired" };
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { coupon: null, error: "Coupon code is invalid or expired" };
  }

  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    return {
      coupon: null,
      error: `This coupon requires a minimum order of ₹${coupon.minOrderAmount.toFixed(2)}`,
    };
  }

  const orderAmount = subtotal + shippingFee + tax;
  let discountAmount = 0;

  if (coupon.type === "percent") {
    discountAmount = Math.round(orderAmount * (coupon.value / 100) * 100) / 100;
  } else if (coupon.type === "shipping") {
    discountAmount = shippingFee;
  } else if (coupon.type === "flat") {
    discountAmount = Math.min(coupon.value, orderAmount);
  }

  return {
    coupon: {
      code: coupon.code,
      label: coupon.label,
      type: coupon.type,
      discountAmount,
    },
    error: null,
  };
};

const incrementCouponUsage = async (code) => {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return;
  await Coupon.updateOne({ code: normalized }, { $inc: { usedCount: 1 } });
};

module.exports = { resolveCoupon, incrementCouponUsage };
