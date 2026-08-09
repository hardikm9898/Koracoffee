const mongoose = require("mongoose");

// Immutable ledger. Rows are only ever created by
// services/inventoryLedgerService.js, never updated or deleted — a
// correction is a new row (e.g. a "damage" or "adjustment" entry), not an
// edit to history. This is what makes stock auditable: at any point you can
// replay every row for an item and get its current stock back.
const TRANSACTION_TYPES = [
  "opening",
  "purchase",
  "consumption",
  "adjustment",
  "damage",
  "wastage",
  "return",
];

const REFERENCE_TYPES = ["purchase", "order", "manual", "adjustment"];

const inventoryTransactionSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
      index: true,
    },
    // Signed: positive for stock increases (purchase/return/opening/+adjustment),
    // negative for decreases (consumption/damage/wastage/-adjustment).
    quantityChange: {
      type: Number,
      required: true,
    },
    beforeStock: {
      type: Number,
      required: true,
      min: 0,
    },
    afterStock: {
      type: Number,
      required: true,
      min: 0,
    },
    unitCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Always a positive magnitude (unitCost * |quantityChange|) — direction
    // is read from `type`/the sign of quantityChange, not from this field.
    totalCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    referenceType: {
      type: String,
      enum: REFERENCE_TYPES,
      default: "manual",
    },
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      default: null,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    // No admin/User relation exists for inventory actions (same situation
    // AuditLog already solved) — denormalize the phone number at write time
    // instead of a ref that would need populating against an allowlist.
    adminPhone: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

inventoryTransactionSchema.index({ item: 1, createdAt: -1 });
inventoryTransactionSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryTransaction", inventoryTransactionSchema);
module.exports.TRANSACTION_TYPES = TRANSACTION_TYPES;
module.exports.REFERENCE_TYPES = REFERENCE_TYPES;
