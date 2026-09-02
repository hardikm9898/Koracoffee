const express = require("express");
const {
  listOrders,
  getOrderById,
  createOrder,
  initiateRazorpayPayment,
  verifyRazorpayPayment,
} = require("../controllers/orderController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// Every route here requires a logged-in user. listOrders/getOrderById scope
// results to req.user unless req.userIsAdmin (see orderController.js) — a
// regular customer can only ever see their own orders through this router.
// Status mutation (PATCH /:orderId, POST /:orderId/advance) is intentionally
// NOT exposed here: only admins may change order status, via
// /api/admin/orders (adminOrderRoutes.js).
router.use(protect);

router.get("/", listOrders);
router.get("/:orderId", getOrderById);
router.post("/", createOrder);
router.post("/razorpay/order", initiateRazorpayPayment);
router.post("/razorpay/verify", verifyRazorpayPayment);

module.exports = router;
