const Order = require("../models/Order");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const shiprocketService = require("../services/shiprocketService");
const { serializeOrder, statusEta } = require("./orderController");

// Admin-triggered: books the order with Shiprocket (create order, assign an
// AWB, request pickup) and moves it to "Shipped". Deliberately not
// automatic on payment — an admin should get a chance to review/pack the
// order before a courier is actually booked. Idempotent: re-calling this on
// an order that's already been through part of the flow (e.g. pickup
// scheduling failed last time) only performs the steps not yet done.
const shipOrder = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.orderId);
  if (!Number.isFinite(orderId)) {
    throw new ApiError(400, "Order id must be a number");
  }

  const order = await Order.findOne({ orderId });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.status === "Cancelled" || order.status === "Refunded") {
    throw new ApiError(400, `Cannot ship an order that is ${order.status}`);
  }

  if (!order.shiprocketShipmentId) {
    const { shiprocketOrderId, shipmentId } = await shiprocketService.createOrder(order);
    order.shiprocketOrderId = shiprocketOrderId;
    order.shiprocketShipmentId = shipmentId;
    await order.save();
  }

  if (!order.awbCode) {
    const { awbCode, courierName } = await shiprocketService.assignAWB(order.shiprocketShipmentId);
    order.awbCode = awbCode;
    order.courierName = courierName;
    await order.save();
  }

  const pickup = await shiprocketService.generatePickup(order.shiprocketShipmentId);

  order.status = "Shipped";
  order.eta = statusEta("Shipped");
  await order.save();

  res.status(200).json({
    success: true,
    data: { ...serializeOrder(order), pickupScheduled: pickup.scheduled },
  });
});

const getShippingLabel = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.orderId);
  if (!Number.isFinite(orderId)) {
    throw new ApiError(400, "Order id must be a number");
  }

  const order = await Order.findOne({ orderId });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  if (!order.shiprocketShipmentId) {
    throw new ApiError(400, "Order has not been shipped via Shiprocket yet");
  }

  const labelUrl = await shiprocketService.generateLabel(order.shiprocketShipmentId);
  order.labelUrl = labelUrl;
  await order.save();

  res.status(200).json({ success: true, data: { labelUrl } });
});

module.exports = { shipOrder, getShippingLabel };
