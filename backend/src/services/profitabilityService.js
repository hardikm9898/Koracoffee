const Order = require("../models/Order");
const Expense = require("../models/Expense");
const InventoryTransaction = require("../models/InventoryTransaction");
const Purchase = require("../models/Purchase");
const Recipe = require("../models/Recipe");
const Product = require("../models/Product");

// Mirrors adminAnalyticsController's revenue-recognition rule — a
// cancelled/refunded order was never real revenue, so it's excluded from
// every calculation below the same way the existing dashboard already
// excludes it, rather than inventing a second convention.
const NON_REVENUE_STATUSES = ["Cancelled", "Refunded"];

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const dateRangeFilter = (dateFrom, dateTo) => {
  const range = {};
  if (dateFrom) range.$gte = new Date(dateFrom);
  if (dateTo) range.$lte = new Date(dateTo);
  return Object.keys(range).length ? range : undefined;
};

// Revenue = Gross Sales - Discounts = Net Sales (+ shipping fee actually
// collected from the customer, which is real revenue too — tax is
// deliberately excluded everywhere here, since collected tax isn't company
// revenue, it's a liability owed elsewhere).
//
// COGS is read directly from the inventory ledger's "consumption" rows,
// not recomputed from recipes — each of those rows already snapshotted the
// real unitCost at the moment the material was actually consumed (see
// orderController.consumeRawMaterialsForOrder), so this reflects true
// historical cost even if avgCost has since drifted from later purchases.
//
// Operating expenses are Expense rows only — never Purchase/consumption
// costs, which is exactly what keeps this from double-counting the same
// spend as both an expense and COGS (see the comment on the Expense model).
const getProfitabilityReport = async ({ dateFrom, dateTo } = {}) => {
  const range = dateRangeFilter(dateFrom, dateTo);

  const orderMatch = { status: { $nin: NON_REVENUE_STATUSES } };
  if (range) orderMatch.createdAt = range;

  const [salesAgg] = await Order.aggregate([
    { $match: orderMatch },
    {
      $group: {
        _id: null,
        grossSales: { $sum: "$subtotal" },
        discounts: { $sum: "$discountAmount" },
        shippingRevenue: { $sum: "$shippingFee" },
        orderCount: { $sum: 1 },
      },
    },
  ]);

  const cogsMatch = { type: "consumption" };
  if (range) cogsMatch.createdAt = range;
  const consumptionTx = await InventoryTransaction.find(cogsMatch).populate("item", "type").lean();

  const cogs = round2(consumptionTx.reduce((sum, tx) => sum + tx.totalCost, 0));
  const cogsByType = consumptionTx.reduce((acc, tx) => {
    const type = tx.item?.type || "other";
    acc[type] = round2((acc[type] || 0) + tx.totalCost);
    return acc;
  }, {});

  const expenseMatch = {};
  if (range) expenseMatch.date = range;
  const [expenseAgg] = await Expense.aggregate([
    { $match: expenseMatch },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const grossSales = round2(salesAgg?.grossSales || 0);
  const discounts = round2(salesAgg?.discounts || 0);
  const shippingRevenue = round2(salesAgg?.shippingRevenue || 0);
  const netSales = round2(grossSales - discounts + shippingRevenue);
  const operatingExpenses = round2(expenseAgg?.total || 0);
  const grossProfit = round2(netSales - cogs);
  const netProfit = round2(grossProfit - operatingExpenses);
  const marginPercent = netSales > 0 ? round2((netProfit / netSales) * 100) : 0;

  return {
    period: { from: dateFrom || null, to: dateTo || null },
    orderCount: salesAgg?.orderCount || 0,
    grossSales,
    discounts,
    shippingRevenue,
    netSales,
    cogs,
    cogsByType,
    operatingExpenses,
    grossProfit,
    netProfit,
    marginPercent,
  };
};

// Per-product estimate, not per-actual-historical-order — deliberately, to
// match what section 4/9 of a BOM-costing feature actually asks for ("what
// would this cost to make right now"), using each active recipe's current
// avgCost-based estimate (see recipeService.computeRecipeCost) against the
// product's current selling price. This is a live snapshot that moves as
// avgCost/basePrice change, not a historical ledger like the period
// profitability report above.
const getProductCostReport = async () => {
  const [products, recipes] = await Promise.all([
    Product.find({}).select("productId name basePrice").lean(),
    Recipe.find({ active: true }).populate("components.item", "avgCost type").lean(),
  ]);

  const recipesByProduct = new Map();
  for (const recipe of recipes) {
    if (!recipesByProduct.has(recipe.product)) recipesByProduct.set(recipe.product, []);
    recipesByProduct.get(recipe.product).push(recipe);
  }

  return products
    .filter((product) => recipesByProduct.has(product.productId))
    .map((product) => {
      const candidates = recipesByProduct.get(product.productId);
      const recipe = candidates.find((r) => !r.variant) || candidates[0];

      const rawMaterialCost = round2(
        recipe.components
          .filter((c) => c.item?.type === "raw_material")
          .reduce((sum, c) => sum + c.quantity * (c.item?.avgCost || 0), 0),
      );
      const packagingCost = round2(
        recipe.components
          .filter((c) => c.item?.type !== "raw_material")
          .reduce((sum, c) => sum + c.quantity * (c.item?.avgCost || 0), 0),
      );
      const totalCogs = round2(rawMaterialCost + packagingCost);
      const sellingPrice = product.basePrice;
      const grossProfit = round2(sellingPrice - totalCogs);
      const marginPercent = sellingPrice > 0 ? round2((grossProfit / sellingPrice) * 100) : 0;

      return {
        productId: product.productId,
        productName: product.name,
        variant: recipe.variant || "all variants",
        sellingPrice,
        rawMaterialCost,
        packagingCost,
        totalCogs,
        grossProfit,
        marginPercent,
      };
    });
};

const getPurchaseReport = async ({ dateFrom, dateTo } = {}) => {
  const range = dateRangeFilter(dateFrom, dateTo);
  const match = { status: "confirmed" };
  if (range) match.confirmedAt = range;

  const bySupplier = await Purchase.aggregate([
    { $match: match },
    { $group: { _id: "$supplier", totalValue: { $sum: "$total" }, purchaseCount: { $sum: 1 } } },
    { $lookup: { from: "suppliers", localField: "_id", foreignField: "_id", as: "supplier" } },
    { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },
    { $project: { supplierName: "$supplier.name", totalValue: 1, purchaseCount: 1 } },
    { $sort: { totalValue: -1 } },
  ]);

  const byItem = await Purchase.aggregate([
    { $match: match },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.item",
        itemName: { $first: "$items.itemName" },
        sku: { $first: "$items.sku" },
        totalQuantity: { $sum: "$items.quantity" },
        totalValue: { $sum: "$items.lineTotal" },
      },
    },
    { $sort: { totalValue: -1 } },
  ]);

  const totalValue = round2(bySupplier.reduce((sum, row) => sum + row.totalValue, 0));

  return {
    period: { from: dateFrom || null, to: dateTo || null },
    totalValue,
    bySupplier: bySupplier.map((row) => ({
      supplierId: row._id ? String(row._id) : null,
      supplierName: row.supplierName || "Unknown",
      purchaseCount: row.purchaseCount,
      totalValue: round2(row.totalValue),
    })),
    byItem: byItem.map((row) => ({
      itemId: row._id ? String(row._id) : null,
      itemName: row.itemName,
      sku: row.sku,
      totalQuantity: row.totalQuantity,
      totalValue: round2(row.totalValue),
    })),
  };
};

module.exports = { getProfitabilityReport, getProductCostReport, getPurchaseReport };
