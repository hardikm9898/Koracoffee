const Purchase = require("../models/Purchase");
const Supplier = require("../models/Supplier");
const InventoryItem = require("../models/InventoryItem");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { increaseStock, decreaseStock } = require("../services/inventoryLedgerService");
const { PAYMENT_STATUSES } = require("../models/Purchase");

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const serializePurchase = (purchase) => ({
  id: String(purchase._id),
  purchaseId: purchase.purchaseId,
  purchaseNumber: purchase.purchaseNumber,
  supplier: purchase.supplier
    ? {
        id: String(purchase.supplier._id || purchase.supplier),
        name: purchase.supplier.name || null,
      }
    : null,
  purchaseDate: purchase.purchaseDate,
  items: purchase.items.map((line) => ({
    item: String(line.item),
    itemName: line.itemName,
    sku: line.sku,
    unit: line.unit,
    quantity: line.quantity,
    unitCost: line.unitCost,
    taxAmount: line.taxAmount,
    discountAmount: line.discountAmount,
    lineTotal: line.lineTotal,
  })),
  subtotal: purchase.subtotal,
  tax: purchase.tax,
  discount: purchase.discount,
  shippingCost: purchase.shippingCost,
  otherCost: purchase.otherCost,
  total: purchase.total,
  paymentStatus: purchase.paymentStatus,
  status: purchase.status,
  confirmedAt: purchase.confirmedAt,
  notes: purchase.notes,
  createdAt: purchase.createdAt,
  updatedAt: purchase.updatedAt,
});

const getNextPurchaseId = async () => {
  const latest = await Purchase.findOne().sort({ purchaseId: -1 }).select("purchaseId").lean();
  return latest ? latest.purchaseId + 1 : 1;
};

// Shared by create and draft-edit — resolves each line's InventoryItem,
// snapshots name/sku/unit, and computes every derived total. Only
// itemId/quantity/unitCost/taxAmount/discountAmount are trusted from the
// client, mirroring how orderController never trusts a client-supplied
// price (see buildOrderPayload / pricingService).
const buildPurchasePayload = async (body = {}) => {
  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (!rawItems.length) {
    throw new ApiError(400, "Purchase must include at least one item");
  }

  const supplierId = String(body.supplier || "").trim();
  if (!supplierId) throw new ApiError(400, "Supplier is required");
  const supplier = await Supplier.findById(supplierId).lean();
  if (!supplier) throw new ApiError(400, "Supplier not found");

  const items = [];
  for (const raw of rawItems) {
    const itemId = Number(raw.itemId);
    const quantity = Number(raw.quantity);
    const unitCost = Number(raw.unitCost);
    const taxAmount = Number(raw.taxAmount) || 0;
    const discountAmount = Number(raw.discountAmount) || 0;

    if (!Number.isFinite(itemId) || !Number.isFinite(quantity) || quantity <= 0) {
      throw new ApiError(400, "Each purchase line needs a valid itemId and a positive quantity");
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new ApiError(400, "Each purchase line needs a valid unit cost");
    }

    const inventoryItem = await InventoryItem.findOne({ itemId }).lean();
    if (!inventoryItem) {
      throw new ApiError(400, `Inventory item #${itemId} not found`);
    }

    const lineTotal = round2(quantity * unitCost + taxAmount - discountAmount);

    items.push({
      item: inventoryItem._id,
      itemName: inventoryItem.name,
      sku: inventoryItem.sku,
      unit: inventoryItem.unit,
      quantity,
      unitCost,
      taxAmount,
      discountAmount,
      lineTotal,
    });
  }

  const subtotal = round2(items.reduce((sum, line) => sum + line.quantity * line.unitCost, 0));
  const tax = round2(items.reduce((sum, line) => sum + line.taxAmount, 0));
  const discount = round2(items.reduce((sum, line) => sum + line.discountAmount, 0));
  const shippingCost = Number(body.shippingCost) || 0;
  const otherCost = Number(body.otherCost) || 0;
  const total = round2(subtotal + tax - discount + shippingCost + otherCost);

  return {
    supplier: supplier._id,
    purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
    items,
    subtotal,
    tax,
    discount,
    shippingCost,
    otherCost,
    total,
    notes: body.notes ? String(body.notes).trim() : "",
  };
};

const listPurchases = asyncHandler(async (req, res) => {
  const { status, paymentStatus, supplier } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (status && Purchase.PURCHASE_STATUSES.includes(status)) filter.status = status;
  if (paymentStatus && PAYMENT_STATUSES.includes(paymentStatus)) filter.paymentStatus = paymentStatus;
  if (supplier) filter.supplier = supplier;

  const [purchases, total] = await Promise.all([
    Purchase.find(filter).populate("supplier", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Purchase.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: purchases.map(serializePurchase),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    },
  });
});

const getPurchase = asyncHandler(async (req, res) => {
  const purchaseId = Number(req.params.purchaseId);
  if (!Number.isFinite(purchaseId)) throw new ApiError(400, "Purchase id must be a number");

  const purchase = await Purchase.findOne({ purchaseId }).populate("supplier", "name");
  if (!purchase) throw new ApiError(404, "Purchase not found");

  res.status(200).json({ success: true, data: serializePurchase(purchase) });
});

const createPurchase = asyncHandler(async (req, res) => {
  const payload = await buildPurchasePayload(req.body);
  const purchaseId = await getNextPurchaseId();
  const purchaseNumber = `PO-${new Date().getFullYear()}-${String(purchaseId).padStart(4, "0")}`;

  const purchase = await Purchase.create({
    purchaseId,
    purchaseNumber,
    ...payload,
  });

  const populated = await Purchase.findById(purchase._id).populate("supplier", "name");
  res.status(201).json({ success: true, data: serializePurchase(populated) });
});

const updatePurchase = asyncHandler(async (req, res) => {
  const purchaseId = Number(req.params.purchaseId);
  if (!Number.isFinite(purchaseId)) throw new ApiError(400, "Purchase id must be a number");

  const purchase = await Purchase.findOne({ purchaseId });
  if (!purchase) throw new ApiError(404, "Purchase not found");
  if (purchase.status === "cancelled") {
    throw new ApiError(400, "Cannot edit a cancelled purchase");
  }

  // Items/costs/supplier/date can only change while still a draft — once
  // confirmed, the ledger already reflects what was received under these
  // numbers, so rewriting them here would silently desync stock history
  // from the purchase record. paymentStatus stays editable regardless,
  // since it doesn't affect inventory.
  //
  // Editing items is a full replacement, not a field-by-field merge — the
  // stored `items` are snapshots ({ item: ObjectId, itemName, sku, ... })
  // in a different shape than what buildPurchasePayload expects as input
  // ({ itemId: Number, quantity, unitCost, ... }), so the client must
  // resend the complete draft (supplier + items + costs) together whenever
  // it wants to change any of them, rather than this endpoint trying to
  // reconcile the two shapes.
  if (req.body.items !== undefined) {
    if (purchase.status !== "draft") {
      throw new ApiError(400, "Only a draft purchase's items can be edited — confirmed purchases are locked");
    }
    const payload = await buildPurchasePayload(req.body);
    Object.assign(purchase, payload);
  } else if (req.body.notes !== undefined) {
    purchase.notes = String(req.body.notes).trim();
  }

  if (req.body.paymentStatus !== undefined) {
    if (!PAYMENT_STATUSES.includes(req.body.paymentStatus)) {
      throw new ApiError(400, `paymentStatus must be one of: ${PAYMENT_STATUSES.join(", ")}`);
    }
    purchase.paymentStatus = req.body.paymentStatus;
  }

  await purchase.save();
  const populated = await Purchase.findById(purchase._id).populate("supplier", "name");
  res.status(200).json({ success: true, data: serializePurchase(populated) });
});

// The only place a Purchase ever touches stock. Guarded by the draft ->
// confirmed status check below, so retrying/reprocessing a confirm request
// (double-click, client retry) can't double-apply — the second attempt
// finds status already "confirmed" and is rejected before touching the
// ledger at all.
const confirmPurchase = asyncHandler(async (req, res) => {
  const purchaseId = Number(req.params.purchaseId);
  if (!Number.isFinite(purchaseId)) throw new ApiError(400, "Purchase id must be a number");

  const purchase = await Purchase.findOne({ purchaseId });
  if (!purchase) throw new ApiError(404, "Purchase not found");
  if (purchase.status !== "draft") {
    throw new ApiError(400, `Only a draft purchase can be confirmed (current status: ${purchase.status})`);
  }

  const adminPhone = req.user?.phoneNumber || "";

  for (const line of purchase.items) {
    await increaseStock({
      itemObjectId: line.item,
      quantity: line.quantity,
      unitCost: line.unitCost,
      type: "purchase",
      referenceType: "purchase",
      purchase: purchase._id,
      reason: `Received against ${purchase.purchaseNumber}`,
      adminPhone,
    });
  }

  purchase.status = "confirmed";
  purchase.confirmedAt = new Date();
  await purchase.save();

  const populated = await Purchase.findById(purchase._id).populate("supplier", "name");
  res.status(200).json({ success: true, data: serializePurchase(populated) });
});

const cancelPurchase = asyncHandler(async (req, res) => {
  const purchaseId = Number(req.params.purchaseId);
  if (!Number.isFinite(purchaseId)) throw new ApiError(400, "Purchase id must be a number");

  const purchase = await Purchase.findOne({ purchaseId });
  if (!purchase) throw new ApiError(404, "Purchase not found");
  if (purchase.status === "cancelled") {
    throw new ApiError(400, "Purchase is already cancelled");
  }

  const adminPhone = req.user?.phoneNumber || "";
  const wasConfirmed = purchase.status === "confirmed";

  if (wasConfirmed) {
    // Reversing a confirmed purchase means taking back the stock it added.
    // If any of that stock has already been consumed elsewhere, the atomic
    // decrease below fails with a clean "insufficient stock" error instead
    // of allowing the item to go negative or silently under-reversing —
    // the purchase stays confirmed in that case and the admin has to
    // resolve the discrepancy manually (e.g. a manual adjustment) rather
    // than this endpoint quietly leaving stock history inconsistent.
    const reversed = [];
    try {
      for (const line of purchase.items) {
        const result = await decreaseStock({
          itemObjectId: line.item,
          quantity: line.quantity,
          unitCost: line.unitCost,
          type: "adjustment",
          referenceType: "purchase",
          reason: `Reversed — ${purchase.purchaseNumber} cancelled`,
          adminPhone,
        });
        reversed.push(result);
      }
    } catch (err) {
      // Give back whatever was already reversed in this loop before
      // rethrowing, so a failure partway through doesn't leave some items
      // reversed and others not.
      for (const entry of reversed) {
        await increaseStock({
          itemObjectId: entry.item._id,
          quantity: Math.abs(entry.transaction.quantityChange),
          unitCost: entry.transaction.unitCost,
          type: "adjustment",
          referenceType: "purchase",
          reason: `Rollback of failed cancellation reversal — ${purchase.purchaseNumber}`,
          adminPhone,
        });
      }
      throw err;
    }
  }

  purchase.status = "cancelled";
  await purchase.save();

  const populated = await Purchase.findById(purchase._id).populate("supplier", "name");
  res.status(200).json({ success: true, data: serializePurchase(populated) });
});

module.exports = {
  listPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  confirmPurchase,
  cancelPurchase,
};
