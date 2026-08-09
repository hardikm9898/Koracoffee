const express = require("express");

const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const { profitability, productCost, purchases } = require("../controllers/reportController");

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/profitability", profitability);
router.get("/product-cost", productCost);
router.get("/purchases", purchases);

module.exports = router;
