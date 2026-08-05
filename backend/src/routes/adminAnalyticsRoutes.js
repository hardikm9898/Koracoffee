const express = require("express");
const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const {
  getOverviewStats,
  getRevenueSeries,
  getChannelPerformance,
  getFulfillmentQueue,
  getProductInventory,
  getSalesOverview,
  getRecentActivities,
} = require("../controllers/adminAnalyticsController");

const router = express.Router();

// All admin routes require authentication
router.use(protect, requireAdmin);

router.get("/overview", getOverviewStats);
router.get("/revenue-series", getRevenueSeries);
router.get("/channels", getChannelPerformance);
router.get("/fulfillment-queue", getFulfillmentQueue);
router.get("/inventory", getProductInventory);
router.get("/sales-overview", getSalesOverview);
router.get("/recent-activities", getRecentActivities);

module.exports = router;
