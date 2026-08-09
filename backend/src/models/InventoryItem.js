const mongoose = require("mongoose");

const INVENTORY_ITEM_TYPES = ["raw_material", "packaging", "consumable", "other"];
const INVENTORY_UNITS = ["pcs", "kg", "g", "litre", "ml", "box", "meter", "cm", "other"];

const inventoryItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },
    type: {
      type: String,
      enum: INVENTORY_ITEM_TYPES,
      required: true,
    },
    unit: {
      type: String,
      enum: INVENTORY_UNITS,
      required: true,
    },
    // Never write this directly outside services/inventoryLedgerService.js —
    // every change must go through an atomic increase/decrease call that
    // also writes an InventoryTransaction row. See known-limitations-style
    // note in that file for why (mirrors Product.variants[].stock's
    // findOneAndUpdate pattern, which is what prevents overselling there).
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    reorderLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Weighted-average cost across all purchase receipts, maintained by
    // inventoryLedgerService.increaseStock. Used for COGS/valuation when a
    // specific consumption doesn't need last-purchase-price precision.
    avgCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPurchaseCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
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

inventoryItemSchema.index({ type: 1, active: 1 });

module.exports = mongoose.model("InventoryItem", inventoryItemSchema);
module.exports.INVENTORY_ITEM_TYPES = INVENTORY_ITEM_TYPES;
module.exports.INVENTORY_UNITS = INVENTORY_UNITS;
