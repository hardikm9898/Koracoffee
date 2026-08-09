const asyncHandler = require("../utils/asyncHandler");
const {
  getProfitabilityReport,
  getProductCostReport,
  getPurchaseReport,
} = require("../services/profitabilityService");

const profitability = asyncHandler(async (req, res) => {
  const data = await getProfitabilityReport({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  });
  res.status(200).json({ success: true, data });
});

const productCost = asyncHandler(async (req, res) => {
  const data = await getProductCostReport();
  res.status(200).json({ success: true, data });
});

const purchases = asyncHandler(async (req, res) => {
  const data = await getPurchaseReport({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  });
  res.status(200).json({ success: true, data });
});

module.exports = { profitability, productCost, purchases };
