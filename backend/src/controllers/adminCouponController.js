const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const Coupon = require("../models/Coupon");

const VALID_TYPES = ["percent", "flat", "shipping"];

const serializeCoupon = (coupon) => ({
  id: coupon._id,
  code: coupon.code,
  type: coupon.type,
  value: coupon.value,
  label: coupon.label,
  active: coupon.active,
  minOrderAmount: coupon.minOrderAmount,
  maxUses: coupon.maxUses,
  usedCount: coupon.usedCount,
  expiresAt: coupon.expiresAt,
  createdAt: coupon.createdAt,
  updatedAt: coupon.updatedAt,
});

const buildCouponPayload = (body = {}, { partial = false } = {}) => {
  const payload = {};

  if (!partial || body.code !== undefined) {
    const code = String(body.code || "").trim().toUpperCase();
    if (!code) throw new ApiError(400, "Coupon code is required");
    payload.code = code;
  }

  if (!partial || body.type !== undefined) {
    if (!VALID_TYPES.includes(body.type)) {
      throw new ApiError(400, `Type must be one of: ${VALID_TYPES.join(", ")}`);
    }
    payload.type = body.type;
  }

  if (!partial || body.label !== undefined) {
    const label = String(body.label || "").trim();
    if (!label) throw new ApiError(400, "Label is required");
    payload.label = label;
  }

  if (body.value !== undefined) {
    const value = Number(body.value);
    if (!Number.isFinite(value) || value < 0) {
      throw new ApiError(400, "Value must be a non-negative number");
    }
    const type = payload.type || body.type;
    if (type === "percent" && value > 100) {
      throw new ApiError(400, "Percent value cannot exceed 100");
    }
    payload.value = value;
  }

  if (body.active !== undefined) {
    payload.active = Boolean(body.active);
  }

  if (body.minOrderAmount !== undefined) {
    const min = Number(body.minOrderAmount);
    if (!Number.isFinite(min) || min < 0) {
      throw new ApiError(400, "minOrderAmount must be a non-negative number");
    }
    payload.minOrderAmount = min;
  }

  if (body.maxUses !== undefined) {
    payload.maxUses = body.maxUses === null || body.maxUses === "" ? null : Number(body.maxUses);
    if (payload.maxUses !== null && (!Number.isFinite(payload.maxUses) || payload.maxUses < 1)) {
      throw new ApiError(400, "maxUses must be a positive number or left blank for unlimited");
    }
  }

  if (body.expiresAt !== undefined) {
    payload.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  }

  return payload;
};

const listCoupons = asyncHandler(async (_req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: coupons.map(serializeCoupon) });
});

const createCoupon = asyncHandler(async (req, res) => {
  const payload = buildCouponPayload(req.body);

  const existing = await Coupon.findOne({ code: payload.code });
  if (existing) {
    throw new ApiError(409, "A coupon with this code already exists");
  }

  const coupon = await Coupon.create(payload);
  res.status(201).json({ success: true, data: serializeCoupon(coupon) });
});

const updateCoupon = asyncHandler(async (req, res) => {
  const payload = buildCouponPayload(req.body, { partial: true });

  if (payload.code) {
    const existing = await Coupon.findOne({ code: payload.code, _id: { $ne: req.params.id } });
    if (existing) {
      throw new ApiError(409, "A coupon with this code already exists");
    }
  }

  const coupon = await Coupon.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });
  if (!coupon) {
    throw new ApiError(404, "Coupon not found");
  }

  res.status(200).json({ success: true, data: serializeCoupon(coupon) });
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) {
    throw new ApiError(404, "Coupon not found");
  }

  res.status(200).json({ success: true, message: "Coupon deleted" });
});

module.exports = { listCoupons, createCoupon, updateCoupon, deleteCoupon };
