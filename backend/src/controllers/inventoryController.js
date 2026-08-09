const InventoryItem = require("../models/InventoryItem");
const InventoryTransaction = require("../models/InventoryTransaction");
const Supplier = require("../models/Supplier");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { increaseStock, decreaseStock } = require("../services/inventoryLedgerService");
const { INVENTORY_ITEM_TYPES, INVENTORY_UNITS } = require("../models/InventoryItem");
const { TRANSACTION_TYPES } = require("../models/InventoryTransaction");

const stockStatus = (item) => {
  if (item.currentStock <= 0) return "out_of_stock";
  if (item.currentStock <= item.minStock) return "critical";
  if (item.currentStock <= item.reorderLevel) return "low";
  return "in_stock";
};

const serializeItem = (item) => ({
  id: String(item._id),
  itemId: item.itemId,
  name: item.name,
  sku: item.sku,
  type: item.type,
  unit: item.unit,
  currentStock: item.currentStock,
  minStock: item.minStock,
  reorderLevel: item.reorderLevel,
  avgCost: item.avgCost,
  lastPurchaseCost: item.lastPurchaseCost,
  stockValue: Math.round(item.currentStock * item.avgCost * 100) / 100,
  status: stockStatus(item),
  supplier: item.supplier
    ? {
        id: String(item.supplier._id || item.supplier),
        name: item.supplier.name || null,
      }
    : null,
  active: item.active,
  notes: item.notes,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const serializeTransaction = (tx) => ({
  id: String(tx._id),
  item: tx.item
    ? {
        id: String(tx.item._id || tx.item),
        name: tx.item.name || null,
        sku: tx.item.sku || null,
        unit: tx.item.unit || null,
      }
    : null,
  type: tx.type,
  quantityChange: tx.quantityChange,
  beforeStock: tx.beforeStock,
  afterStock: tx.afterStock,
  unitCost: tx.unitCost,
  totalCost: tx.totalCost,
  referenceType: tx.referenceType,
  purchase: tx.purchase ? String(tx.purchase) : null,
  order: tx.order ? String(tx.order) : null,
  reason: tx.reason,
  adminPhone: tx.adminPhone,
  createdAt: tx.createdAt,
});

const getNextItemId = async () => {
  const latest = await InventoryItem.findOne().sort({ itemId: -1 }).select("itemId").lean();
  return latest ? latest.itemId + 1 : 1;
};

const listItems = asyncHandler(async (req, res) => {
  const { type, active, search, stock } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (type && INVENTORY_ITEM_TYPES.includes(type)) {
    filter.type = type;
  }
  if (active === "true" || active === "false") {
    filter.active = active === "true";
  }
  if (search) {
    const regex = { $regex: String(search).trim(), $options: "i" };
    filter.$or = [{ name: regex }, { sku: regex }];
  }

  // Low-stock filters compare two fields on the same document — Mongo can't
  // do that in a plain query filter, so pull candidates then filter in JS.
  // Fine at this data scale (raw-material catalogs are small); revisit with
  // an aggregation $expr if this table ever grows into the thousands.
  let items = await InventoryItem.find(filter).populate("supplier", "name").sort({ name: 1 });

  if (stock === "low") {
    items = items.filter((item) => item.currentStock > item.minStock && item.currentStock <= item.reorderLevel);
  } else if (stock === "critical") {
    items = items.filter((item) => item.currentStock > 0 && item.currentStock <= item.minStock);
  } else if (stock === "out") {
    items = items.filter((item) => item.currentStock <= 0);
  }

  const total = items.length;
  const paged = items.slice(skip, skip + limit);

  res.status(200).json({
    success: true,
    data: {
      items: paged.map(serializeItem),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    },
  });
});

const getItem = asyncHandler(async (req, res) => {
  const itemId = Number(req.params.itemId);
  if (!Number.isFinite(itemId)) {
    throw new ApiError(400, "Item id must be a number");
  }

  const item = await InventoryItem.findOne({ itemId }).populate("supplier", "name");
  if (!item) {
    throw new ApiError(404, "Inventory item not found");
  }

  res.status(200).json({ success: true, data: serializeItem(item) });
});

const createItem = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const sku = String(req.body.sku || "").trim().toUpperCase();
  const type = String(req.body.type || "").trim();
  const unit = String(req.body.unit || "").trim();

  if (!name) throw new ApiError(400, "Item name is required");
  if (!sku) throw new ApiError(400, "SKU is required");
  if (!INVENTORY_ITEM_TYPES.includes(type)) {
    throw new ApiError(400, `Type must be one of: ${INVENTORY_ITEM_TYPES.join(", ")}`);
  }
  if (!INVENTORY_UNITS.includes(unit)) {
    throw new ApiError(400, `Unit must be one of: ${INVENTORY_UNITS.join(", ")}`);
  }

  const existingSku = await InventoryItem.findOne({ sku }).lean();
  if (existingSku) {
    throw new ApiError(400, `An item with SKU '${sku}' already exists`);
  }

  const minStock = Number(req.body.minStock) || 0;
  const reorderLevel = Number(req.body.reorderLevel) || 0;
  const openingStock = Number(req.body.openingStock) || 0;
  const openingCost = Number(req.body.openingCost) || 0;
  const supplier = req.body.supplier ? String(req.body.supplier).trim() : null;

  if (supplier) {
    const supplierExists = await Supplier.findById(supplier).lean();
    if (!supplierExists) {
      throw new ApiError(400, "Supplier not found");
    }
  }

  const itemId = await getNextItemId();

  let item = await InventoryItem.create({
    itemId,
    name,
    sku,
    type,
    unit,
    minStock,
    reorderLevel,
    supplier,
    notes: req.body.notes ? String(req.body.notes).trim() : "",
  });

  if (openingStock > 0) {
    const result = await increaseStock({
      itemObjectId: item._id,
      quantity: openingStock,
      unitCost: openingCost,
      type: "opening",
      referenceType: "manual",
      reason: "Opening stock at item creation",
      adminPhone: req.user?.phoneNumber || "",
    });
    item = result.item;
    // Opening stock is the one increase type that should also seed avgCost,
    // since increaseStock only auto-computes it for type "purchase".
    if (openingCost > 0) {
      item.avgCost = openingCost;
      item.lastPurchaseCost = openingCost;
      await item.save();
    }
  }

  const populated = await InventoryItem.findById(item._id).populate("supplier", "name");
  res.status(201).json({ success: true, data: serializeItem(populated) });
});

const updateItem = asyncHandler(async (req, res) => {
  const itemId = Number(req.params.itemId);
  if (!Number.isFinite(itemId)) {
    throw new ApiError(400, "Item id must be a number");
  }

  const item = await InventoryItem.findOne({ itemId });
  if (!item) {
    throw new ApiError(404, "Inventory item not found");
  }

  // currentStock/avgCost/lastPurchaseCost are deliberately not editable
  // here — they only ever change through the ledger service, so every
  // change stays traceable.
  const editable = ["name", "sku", "type", "unit", "minStock", "reorderLevel", "supplier", "active", "notes"];
  for (const field of editable) {
    if (req.body[field] === undefined) continue;

    if (field === "sku") {
      const sku = String(req.body.sku).trim().toUpperCase();
      const existing = await InventoryItem.findOne({ sku, _id: { $ne: item._id } }).lean();
      if (existing) throw new ApiError(400, `An item with SKU '${sku}' already exists`);
      item.sku = sku;
      continue;
    }
    if (field === "type" && !INVENTORY_ITEM_TYPES.includes(req.body.type)) {
      throw new ApiError(400, `Type must be one of: ${INVENTORY_ITEM_TYPES.join(", ")}`);
    }
    if (field === "unit" && !INVENTORY_UNITS.includes(req.body.unit)) {
      throw new ApiError(400, `Unit must be one of: ${INVENTORY_UNITS.join(", ")}`);
    }
    if (field === "supplier" && req.body.supplier) {
      const supplierExists = await Supplier.findById(req.body.supplier).lean();
      if (!supplierExists) throw new ApiError(400, "Supplier not found");
    }

    item[field] = req.body[field];
  }

  await item.save();
  const populated = await InventoryItem.findById(item._id).populate("supplier", "name");
  res.status(200).json({ success: true, data: serializeItem(populated) });
});

const adjustStock = asyncHandler(async (req, res) => {
  const itemId = Number(req.params.itemId);
  if (!Number.isFinite(itemId)) {
    throw new ApiError(400, "Item id must be a number");
  }

  const quantityChange = Number(req.body.quantityChange);
  const reason = String(req.body.reason || "").trim();
  const type = String(req.body.type || "adjustment").trim();

  if (!Number.isFinite(quantityChange) || quantityChange === 0) {
    throw new ApiError(400, "quantityChange must be a non-zero number");
  }
  if (!reason) {
    throw new ApiError(400, "A reason is required for a manual stock change");
  }
  if (!["adjustment", "damage", "wastage", "return"].includes(type)) {
    throw new ApiError(400, "type must be one of: adjustment, damage, wastage, return");
  }

  const item = await InventoryItem.findOne({ itemId });
  if (!item) {
    throw new ApiError(404, "Inventory item not found");
  }

  const adminPhone = req.user?.phoneNumber || "";
  const isIncrease = quantityChange > 0 || type === "return";

  const result = isIncrease
    ? await increaseStock({
        itemObjectId: item._id,
        quantity: Math.abs(quantityChange),
        unitCost: item.avgCost,
        type: type === "return" ? "return" : "adjustment",
        referenceType: "adjustment",
        reason,
        adminPhone,
      })
    : await decreaseStock({
        itemObjectId: item._id,
        quantity: Math.abs(quantityChange),
        type,
        referenceType: "adjustment",
        reason,
        adminPhone,
      });

  const populated = await InventoryItem.findById(result.item._id).populate("supplier", "name");
  res.status(200).json({
    success: true,
    data: { item: serializeItem(populated), transaction: serializeTransaction(result.transaction) },
  });
});

const listLedger = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.itemId) {
    const item = await InventoryItem.findOne({ itemId: Number(req.query.itemId) }).select("_id").lean();
    filter.item = item ? item._id : null;
  }
  if (req.query.type && TRANSACTION_TYPES.includes(req.query.type)) {
    filter.type = req.query.type;
  }
  if (req.query.order) {
    filter.order = req.query.order;
  }
  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo);
  }

  const [transactions, total] = await Promise.all([
    InventoryTransaction.find(filter)
      .populate("item", "name sku unit")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    InventoryTransaction.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: transactions.map(serializeTransaction),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    },
  });
});

const getDashboard = asyncHandler(async (req, res) => {
  const items = await InventoryItem.find({ active: true });

  const totalValue = items.reduce((sum, item) => sum + item.currentStock * item.avgCost, 0);
  const lowStock = items.filter((item) => item.currentStock > item.minStock && item.currentStock <= item.reorderLevel);
  const criticalStock = items.filter((item) => item.currentStock > 0 && item.currentStock <= item.minStock);
  const outOfStock = items.filter((item) => item.currentStock <= 0);

  res.status(200).json({
    success: true,
    data: {
      totalItems: items.length,
      totalInventoryValue: Math.round(totalValue * 100) / 100,
      lowStockCount: lowStock.length,
      criticalStockCount: criticalStock.length,
      outOfStockCount: outOfStock.length,
      lowStockItems: [...criticalStock, ...lowStock, ...outOfStock].map(serializeItem),
    },
  });
});

module.exports = {
  listItems,
  getItem,
  createItem,
  updateItem,
  adjustStock,
  listLedger,
  getDashboard,
};
