const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    variant: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: null, trim: true },
  },
  { _id: false },
);

const itemStatusSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Received", "Roasting", "Packaging", "Shipped", "Delivered", "Cancelled", "Refunded"],
      default: "Received",
    },
    cancelledBy: {
      type: String,
      enum: ["admin", "user"],
      default: null,
    },
    cancelReason: {
      type: String,
      trim: true,
      default: "",
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const shippingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    apartment: { type: String, trim: true, default: "" },
    company: { type: String, trim: true, default: "" },
    zip: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    orderCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Received", "Roasting", "Packaging", "Shipped", "Delivered", "Cancelled", "Refunded"],
      default: "Received",
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: "Card",
    },
    cancelReason: {
      type: String,
      trim: true,
      default: "",
    },
    refundReason: {
      type: String,
      trim: true,
      default: "",
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(items) => items.length > 0, "Orders must include at least one item"],
    },
    itemStatus: {
      type: [itemStatusSchema],
      default: [],
    },
    shipping: {
      type: shippingSchema,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingFee: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    eta: {
      type: String,
      default: "Preparing your roast",
      trim: true,
    },
    couponCode: {
      type: String,
      trim: true,
      default: "",
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountLabel: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Order", orderSchema);
