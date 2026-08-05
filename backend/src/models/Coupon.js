const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["percent", "flat", "shipping"],
      required: true,
    },
    // percent: 0-100 (whole number, e.g. 20 means 20%). flat: currency
    // amount. shipping: unused (discount = whatever the shipping fee is).
    value: {
      type: Number,
      default: 0,
      min: 0,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // null = unlimited uses.
    maxUses: {
      type: Number,
      default: null,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Coupon", couponSchema);
