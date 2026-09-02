const express = require("express");

const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const {
  listOrders,
  getOrderById,
  updateOrderStatus,
  advanceOrderStatus,
  getPackingSlip,
} = require("../controllers/orderController");
const { shipOrder, getShippingLabel } = require("../controllers/shippingController");

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", listOrders);
router.get("/:orderId", getOrderById);
router.get("/:orderId/packing-slip", getPackingSlip);
router.patch("/:orderId", updateOrderStatus);
router.post("/:orderId/advance", advanceOrderStatus);
router.post("/:orderId/ship", shipOrder);
router.post("/:orderId/label", getShippingLabel);

module.exports = router;
