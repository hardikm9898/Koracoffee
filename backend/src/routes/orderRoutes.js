const express = require("express");
const {
  listOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  advanceOrderStatus,
} = require("../controllers/orderController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", listOrders);
router.get("/:orderId", getOrderById);
router.post("/", protect, createOrder);
router.patch("/:orderId", updateOrderStatus);
router.post("/:orderId/advance", advanceOrderStatus);

module.exports = router;
