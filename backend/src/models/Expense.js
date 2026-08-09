const mongoose = require("mongoose");

// Deliberately excludes "raw material purchase" and "packaging" as
// categories — those costs already flow through Purchase ->
// InventoryTransaction and get counted as COGS from there. Letting them
// also be logged here would double-count the same cost as both an expense
// and COGS in the profitability report (services/profitabilityService.js).
// This stays operational-expense-only by construction.
const EXPENSE_CATEGORIES = [
  "shipping",
  "labour",
  "rent",
  "utilities",
  "marketing",
  "platform_fees",
  "misc",
  "other",
];

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    vendor: {
      type: String,
      trim: true,
      default: "",
    },
    reference: {
      type: String,
      trim: true,
      default: "",
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    // Optional link when an expense is tied to a specific order (e.g. an
    // unusually expensive courier pickup for one shipment) — most expenses
    // (rent, marketing) won't have one.
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
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

expenseSchema.index({ category: 1, date: -1 });
expenseSchema.index({ date: -1 });

module.exports = mongoose.model("Expense", expenseSchema);
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
