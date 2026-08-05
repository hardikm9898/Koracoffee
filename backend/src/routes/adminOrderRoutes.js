const express = require("express");

const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const {
  listOrders,
  getOrderById,
  updateOrderStatus,
  advanceOrderStatus,
} = require("../controllers/orderController");

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", listOrders);
router.get("/:orderId", getOrderById);
router.patch("/:orderId", updateOrderStatus);
router.post("/:orderId/advance", advanceOrderStatus);

module.exports = router;
