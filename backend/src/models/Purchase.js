const mongoose = require("mongoose");

const PAYMENT_STATUSES = ["unpaid", "partial", "paid"];
const PURCHASE_STATUSES = ["draft", "confirmed", "cancelled"];

// Snapshots item name/sku/unit at purchase time (same reasoning as
// Order.items[] snapshotting product name/price — a later rename/edit of
// the InventoryItem shouldn't retroactively rewrite purchase history).
const purchaseItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    itemName: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const purchaseSchema = new mongoose.Schema(
  {
    purchaseId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    purchaseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    items: {
      type: [purchaseItemSchema],
      required: true,
      validate: [(items) => items.length > 0, "Purchase must include at least one item"],
    },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    otherCost: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "unpaid",
    },
    // Stock only increases when status becomes "confirmed" — see
    // purchaseController.confirmPurchase. A draft can be freely edited; a
    // confirmed purchase's items/costs are locked (only paymentStatus/notes
    // stay editable) since the ledger already reflects what was received.
    status: {
      type: String,
      enum: PURCHASE_STATUSES,
      default: "draft",
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

purchaseSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Purchase", purchaseSchema);
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
module.exports.PURCHASE_STATUSES = PURCHASE_STATUSES;
