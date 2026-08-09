const InventoryItem = require("../models/InventoryItem");
const InventoryTransaction = require("../models/InventoryTransaction");
const ApiError = require("../utils/ApiError");

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

// Stock increases (purchase receipts, returns, opening balance, positive
// manual adjustments) never need a conditional guard — there's no upper
// bound to race against, unlike decreases.
//
// Weighted-average cost is only recomputed for type === "purchase" — other
// increase types (return/opening/adjustment) don't necessarily carry a
// meaningful unit cost.
const increaseStock = async ({
  itemObjectId,
  quantity,
  unitCost = 0,
  type,
  referenceType = "manual",
  purchase = null,
  order = null,
  reason = "",
  adminPhone = "",
}) => {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new ApiError(400, "Quantity must be a positive number");
  }

  const item = await InventoryItem.findById(itemObjectId);
  if (!item) {
    throw new ApiError(404, "Inventory item not found");
  }

  const beforeStock = item.currentStock;
  const update = { $inc: { currentStock: quantity } };

  // Reads the pre-update stock/avgCost above, then writes the recompute in
  // the same call as the $inc below — there's a small race window under
  // heavy concurrent purchases where two receipts landing at the same
  // instant could both blend from the same starting avgCost, producing a
  // slightly-off (not wrong-direction, just imprecise) average. currentStock
  // itself stays exact regardless (the $inc is unconditional and atomic) —
  // only the *cost* figure has this soft edge, an acceptable tradeoff for a
  // moving-average costing model without multi-document transactions (this
  // deployment's MongoDB is a standalone instance, not a replica set — see
  // orderController's stock-decrement comment for the same constraint
  // elsewhere in this codebase).
  if (type === "purchase" && unitCost > 0) {
    const newAvgCost =
      beforeStock > 0
        ? round2((item.avgCost * beforeStock + unitCost * quantity) / (beforeStock + quantity))
        : unitCost;
    update.$set = { avgCost: newAvgCost, lastPurchaseCost: unitCost };
  }

  const updated = await InventoryItem.findByIdAndUpdate(itemObjectId, update, { new: true });
  const afterStock = updated.currentStock;

  const transaction = await InventoryTransaction.create({
    item: itemObjectId,
    type,
    quantityChange: quantity,
    beforeStock,
    afterStock,
    unitCost,
    totalCost: round2(unitCost * quantity),
    referenceType,
    purchase,
    order,
    reason,
    adminPhone,
  });

  return { item: updated, transaction };
};

// Stock decreases (consumption, damage, wastage, negative manual
// adjustments). Mirrors orderController.applyOrderInventoryChanges: the
// query condition (currentStock >= quantity) and the $inc happen together
// as one atomic MongoDB operation, so concurrent decrements against the
// same item can't both pass a check and both apply — there is no separate
// "check" step for a race to open up in. Never allows stock below 0,
// matching the existing finished-goods stock behavior — a correction that
// would require going negative should be handled as a data/count issue, not
// bypassed here.
const decreaseStock = async ({
  itemObjectId,
  quantity,
  unitCost = null,
  type,
  referenceType = "manual",
  order = null,
  reason = "",
  adminPhone = "",
}) => {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new ApiError(400, "Quantity must be a positive number");
  }

  const item = await InventoryItem.findById(itemObjectId);
  if (!item) {
    throw new ApiError(404, "Inventory item not found");
  }

  // Falls back to the item's own average cost when the caller doesn't know
  // a specific unit cost for this decrement (e.g. a recipe consumption,
  // where the "cost" of the raw material is whatever it's worth on average,
  // not a per-order purchase price).
  const effectiveUnitCost = unitCost ?? item.avgCost;

  const updated = await InventoryItem.findOneAndUpdate(
    { _id: itemObjectId, currentStock: { $gte: quantity } },
    { $inc: { currentStock: -quantity } },
    { new: true },
  );

  if (!updated) {
    throw new ApiError(
      400,
      `Insufficient stock for ${item.name}. Available: ${item.currentStock}, requested: ${quantity}`,
    );
  }

  const beforeStock = updated.currentStock + quantity;
  const afterStock = updated.currentStock;

  const transaction = await InventoryTransaction.create({
    item: itemObjectId,
    type,
    quantityChange: -quantity,
    beforeStock,
    afterStock,
    unitCost: effectiveUnitCost,
    totalCost: round2(effectiveUnitCost * quantity),
    referenceType,
    order,
    reason,
    adminPhone,
  });

  return { item: updated, transaction };
};

module.exports = { increaseStock, decreaseStock };
