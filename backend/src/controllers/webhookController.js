const Order = require("../models/Order");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");
const { statusEta } = require("./orderController");

// Only auto-advance Order.status for statuses we're fully confident about
// mapping unambiguously. Everything else (in transit, out for delivery,
// pickup scheduled, etc.) just updates the raw trackingStatus text — safer
// than guessing a mapping into our own Received/Roasting/Packaging/Shipped
// enum for statuses that don't correspond 1:1.
const mapToOrderStatus = (shiprocketStatus) => {
  const normalized = String(shiprocketStatus || "").toLowerCase();
  if (normalized.includes("delivered") && !normalized.includes("undelivered")) {
    return "Delivered";
  }
  if (normalized.includes("cancel")) {
    return "Cancelled";
  }
  return null;
};

// Verified via the shared "Webhook Secret" configured in Shiprocket's
// dashboard (Settings > API > Webhook), sent back on the X-Api-Key header
// of every callback — a plain shared-secret check, not HMAC. Public route
// (no `protect`) since Shiprocket isn't one of our users; this header is
// the only thing standing between this endpoint and anyone on the internet
// being able to alter order status, so SHIPROCKET_WEBHOOK_SECRET must be
// treated as sensitive and must exactly match the dashboard value.
const handleShiprocketWebhook = asyncHandler(async (req, res) => {
  const providedSecret = req.headers["x-api-key"];
  const expectedSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;

  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    throw new ApiError(401, "Invalid webhook credentials");
  }

  const {
    order_id: orderCode,
    awb,
    current_status: currentStatus,
    courier_name: courierName,
  } = req.body || {};

  // Prefer matching by AWB (assigned directly by Shiprocket, stored on
  // Order.awbCode when we booked it) — fall back to order_id, which could
  // be either the orderCode we originally sent them or their own numeric
  // order id, depending on webhook payload version.
  const filter = awb
    ? { awbCode: String(awb) }
    : orderCode
      ? { $or: [{ orderCode: String(orderCode) }, { shiprocketOrderId: Number(orderCode) }] }
      : null;

  if (!filter) {
    return res.status(200).json({ success: true });
  }

  const order = await Order.findOne(filter);
  if (!order) {
    logger.warn({ orderCode, awb }, "Shiprocket webhook: no matching order");
    return res.status(200).json({ success: true });
  }

  order.trackingStatus = String(currentStatus || "").trim();
  if (courierName) {
    order.courierName = courierName;
  }

  const mappedStatus = mapToOrderStatus(currentStatus);
  if (mappedStatus && order.status !== "Cancelled" && order.status !== "Refunded") {
    order.status = mappedStatus;
    order.eta = statusEta(mappedStatus);
  }

  await order.save();
  res.status(200).json({ success: true });
});

module.exports = { handleShiprocketWebhook };
