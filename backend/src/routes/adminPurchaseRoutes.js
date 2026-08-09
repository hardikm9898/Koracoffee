const express = require("express");

const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const {
  listPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  confirmPurchase,
  cancelPurchase,
} = require("../controllers/purchaseController");

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", listPurchases);
router.get("/:purchaseId", getPurchase);
router.post("/", createPurchase);
router.patch("/:purchaseId", updatePurchase);
router.post("/:purchaseId/confirm", confirmPurchase);
router.post("/:purchaseId/cancel", cancelPurchase);

module.exports = router;
