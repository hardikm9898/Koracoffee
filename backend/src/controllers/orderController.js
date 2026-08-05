const Order = require("../models/Order");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { findUserCart, findGuestCart } = require("../services/cartService");

const normalizeSessionId = (value = "") => String(value).trim();

const extractSessionIdFromReq = (req) =>
  normalizeSessionId(
    req.body?.sessionId ||
      req.query?.sessionId ||
      req.headers["x-session-id"] ||
      "",
  );

const VALID_STATUSES = [
  "Received",
  "Roasting",
  "Packaging",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Refunded",
];
const ADVANCE_FLOW = [
  "Received",
  "Roasting",
  "Packaging",
  "Shipped",
  "Delivered",
];

const statusEta = (status) => {
  switch (status) {
    case "Received":
      return "Roast queue — ready to begin";
    case "Roasting":
      return "Currently in the roaster";
    case "Packaging":
      return "Packing for transit";
    case "Shipped":
      return "On the way to your door";
    case "Delivered":
      return "Delivered successfully";
    case "Cancelled":
      return "Order was cancelled";
    case "Refunded":
      return "Amount refunded to customer";
    default:
      return "Preparing your roast";
  }
};

const serializeOrder = (order) => ({
  id: order.orderId,
  orderCode: order.orderCode,
  status: order.status,
  items: order.items,
  shipping: order.shipping,
  subtotal: order.subtotal,
  shippingFee: order.shippingFee,
  tax: order.tax,
  discountAmount: order.discountAmount,
  discountLabel: order.discountLabel,
  couponCode: order.couponCode,
  total: order.total,
  eta: order.eta,
  notes: order.notes,
  paymentMethod: order.paymentMethod,
  cancelReason: order.cancelReason,
  refundReason: order.refundReason,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const COUPONS = {
  AURA20: {
    type: "percent",
    value: 20,
    label: "20% off your order",
  },
  FREESHIP: {
    type: "shipping",
    value: 1,
    label: "Free shipping",
  },
  WELCOME50: {
    type: "flat",
    value: 50,
    label: "₹50 off your order",
  },
};

const getCouponDetails = (code) => {
  const normalized = String(code || "")
    .trim()
    .toUpperCase();
  if (!normalized) return null;
  return COUPONS[normalized] || null;
};

const calculateCouponDiscount = (coupon, subtotal, shippingFee, tax) => {
  if (!coupon) {
    return { discountAmount: 0, discountLabel: "" };
  }

  const orderAmount = subtotal + shippingFee + tax;

  switch (coupon.type) {
    case "percent": {
      const discountAmount = Math.round(orderAmount * coupon.value * 100) / 100;
      return { discountAmount, discountLabel: coupon.label };
    }
    case "shipping": {
      const discountAmount = Math.min(shippingFee, shippingFee);
      return { discountAmount, discountLabel: coupon.label };
    }
    case "flat": {
      const discountAmount = Math.min(coupon.value, orderAmount);
      return { discountAmount, discountLabel: coupon.label };
    }
    default:
      return { discountAmount: 0, discountLabel: "" };
  }
};

const validateOrderItemsAgainstInventory = async (items) => {
  const groupedItems = items.reduce((acc, item) => {
    const key = `${item.productId}||${item.variant}`;
    if (!acc[key]) {
      acc[key] = { ...item, quantity: 0 };
    }
    acc[key].quantity += item.quantity;
    return acc;
  }, {});

  for (const key of Object.keys(groupedItems)) {
    const orderItem = groupedItems[key];
    const product = await Product.findOne({
      productId: orderItem.productId,
    }).select("name variants inStock");

    if (!product) {
      throw new ApiError(
        400,
        `Product not found for order item ${orderItem.name}`,
      );
    }

    const variant =
      Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants.find((item) => item.label === orderItem.variant)
        : null;

    if (
      Array.isArray(product.variants) &&
      product.variants.length > 0 &&
      !variant
    ) {
      throw new ApiError(
        400,
        `Variant '${orderItem.variant}' not found for product ${product.name}`,
      );
    }

    if (!variant) {
      continue;
    }

    const currentStock = Number.isFinite(variant.stock) ? variant.stock : null;
    if (currentStock !== null && orderItem.quantity > currentStock) {
      throw new ApiError(
        400,
        `Insufficient stock for ${product.name} (${orderItem.variant}). Available: ${currentStock}, requested: ${orderItem.quantity}`,
      );
    }
  }
};

const applyOrderInventoryChanges = async (items) => {
  const groupedItems = items.reduce((acc, item) => {
    const key = `${item.productId}||${item.variant}`;
    if (!acc[key]) {
      acc[key] = { ...item, quantity: 0 };
    }
    acc[key].quantity += item.quantity;
    return acc;
  }, {});

  for (const key of Object.keys(groupedItems)) {
    const orderItem = groupedItems[key];
    const product = await Product.findOne({ productId: orderItem.productId });

    if (!product) {
      continue;
    }

    const variant =
      Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants.find((item) => item.label === orderItem.variant)
        : null;

    if (!variant) {
      continue;
    }

    if (Number.isFinite(variant.stock)) {
      variant.stock = Math.max(0, variant.stock - orderItem.quantity);
    }

    product.inStock = Array.isArray(product.variants)
      ? product.variants.some(
          (item) => !Number.isFinite(item.stock) || item.stock > 0,
        )
      : product.inStock;

    await product.save();
  }
};

const clearOrderedItemsFromCart = async ({ userId, sessionId, items }) => {
  const cart = userId
    ? await findUserCart(userId)
    : sessionId
      ? await findGuestCart(sessionId)
      : null;

  if (!cart) {
    return;
  }

  const orderedQuantities = items.reduce((acc, item) => {
    const key = `${item.productId}||${item.variant}`;
    acc[key] = (acc[key] || 0) + item.quantity;
    return acc;
  }, {});

  cart.items = cart.items.flatMap((cartItem) => {
    const key = `${cartItem.productId}||${cartItem.variant}`;
    const orderedQuantity = orderedQuantities[key] || 0;
    if (orderedQuantity <= 0) {
      return [cartItem];
    }

    const remaining = cartItem.quantity - orderedQuantity;
    return remaining > 0 ? [{ ...cartItem, quantity: remaining }] : [];
  });

  await cart.save();
};

const buildOrderPayload = (body = {}) => {
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) {
    throw new ApiError(400, "Order must include at least one item");
  }

  const shipping = body.shipping || {};
  const requiredShipping = [
    "name",
    "email",
    "phone",
    "address",
    "city",
    "state",
    "country",
    "zip",
  ];
  for (const field of requiredShipping) {
    if (!shipping[field]) {
      throw new ApiError(400, `Shipping ${field} is required`);
    }
  }

  const parsedItems = items.map((item) => ({
    productId: Number(item.productId),
    name: String(item.name || "").trim(),
    variant: String(item.variant || "").trim(),
    quantity: Number(item.quantity),
    price: Number(item.price),
    image: item.image ? String(item.image).trim() : null,
  }));

  if (
    parsedItems.some(
      (item) =>
        !item.productId || !item.name || item.quantity < 1 || item.price < 0,
    )
  ) {
    throw new ApiError(
      400,
      "Each order item must include a valid productId, name, quantity and price",
    );
  }

  const subtotal = parsedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shippingFee = 5.0;
  const tax = Math.round(subtotal * 0.08 * 100) / 100;

  const couponCode = String(body.couponCode || "")
    .trim()
    .toUpperCase();
  const coupon = couponCode ? getCouponDetails(couponCode) : null;
  if (couponCode && !coupon) {
    throw new ApiError(400, "Coupon code is invalid or expired");
  }

  const { discountAmount, discountLabel } = calculateCouponDiscount(
    coupon,
    subtotal,
    shippingFee,
    tax,
  );
  const total =
    Math.round((subtotal + shippingFee + tax - discountAmount) * 100) / 100;

  if (!Number.isFinite(total) || total < 0) {
    throw new ApiError(400, "Total must be a valid positive number");
  }

  const payload = {
    items: parsedItems,
    shipping: {
      name: String(shipping.name).trim(),
      email: String(shipping.email).trim(),
      phone: String(shipping.phone).trim(),
      address: String(shipping.address).trim(),
      apartment: String(shipping.apartment || "").trim(),
      company: String(shipping.company || "").trim(),
      city: String(shipping.city).trim(),
      state: String(shipping.state).trim(),
      country: String(shipping.country).trim(),
      zip: String(shipping.zip).trim(),
    },
    subtotal,
    shippingFee,
    tax,
    couponCode: couponCode || "",
    discountAmount,
    discountLabel,
    total,
    notes: body.notes ? String(body.notes).trim() : "",
    paymentMethod: body.paymentMethod
      ? String(body.paymentMethod).trim()
      : "Card",
    cancelReason: body.cancelReason ? String(body.cancelReason).trim() : "",
    refundReason: body.refundReason ? String(body.refundReason).trim() : "",
  };

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      throw new ApiError(400, "Invalid order status");
    }
    payload.status = body.status;
    payload.eta = statusEta(body.status);
  } else {
    payload.status = "Received";
    payload.eta = statusEta("Received");
  }

  return payload;
};

const getNextStatus = (status) => {
  const currentIndex = ADVANCE_FLOW.indexOf(status);
  if (currentIndex === -1 || currentIndex >= ADVANCE_FLOW.length - 1) {
    return status;
  }
  return ADVANCE_FLOW[currentIndex + 1];
};

const listOrders = asyncHandler(async (req, res) => {
  const status = req.query.status ? String(req.query.status).trim() : undefined;

  const filter = {};
  if (status && VALID_STATUSES.includes(status)) {
    filter.status = status;
  }

  const orders = await Order.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: orders.map(serializeOrder),
  });
});

const getOrderById = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.orderId);
  if (!Number.isFinite(orderId)) {
    throw new ApiError(400, "Order id must be a number");
  }

  const order = await Order.findOne({ orderId });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  res.status(200).json({
    success: true,
    data: serializeOrder(order),
  });
});

const createOrder = asyncHandler(async (req, res) => {
  const payload = buildOrderPayload(req.body);

  await validateOrderItemsAgainstInventory(payload.items);

  const latestOrder = await Order.findOne()
    .sort({ orderId: -1 })
    .select("orderId")
    .lean();
  const orderId = latestOrder ? latestOrder.orderId + 1 : 1;
  const orderCode = `AURA-${new Date().getFullYear()}-${String(orderId).padStart(4, "0")}`;

  const order = await Order.create({
    orderId,
    orderCode,
    ...payload,
  });

  await applyOrderInventoryChanges(payload.items);

  await clearOrderedItemsFromCart({
    userId: req.user?._id,
    sessionId: extractSessionIdFromReq(req),
    items: payload.items,
  });

  res.status(201).json({
    success: true,
    data: serializeOrder(order),
  });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.orderId);
  if (!Number.isFinite(orderId)) {
    throw new ApiError(400, "Order id must be a number");
  }

  const { status, cancelReason, refundReason } = req.body;
  if (!status || !VALID_STATUSES.includes(status)) {
    throw new ApiError(400, "Invalid order status");
  }

  if (status === "Cancelled" && !cancelReason) {
    throw new ApiError(
      400,
      "Cancel reason is required when cancelling an order",
    );
  }

  if (status === "Refunded" && !refundReason) {
    throw new ApiError(
      400,
      "Refund reason is required when refunding an order",
    );
  }

  const order = await Order.findOne({ orderId });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  order.status = status;
  order.eta = statusEta(status);
  order.cancelReason =
    status === "Cancelled"
      ? String(cancelReason || "").trim()
      : order.cancelReason;
  order.refundReason =
    status === "Refunded"
      ? String(refundReason || "").trim()
      : order.refundReason;
  await order.save();

  res.status(200).json({
    success: true,
    data: serializeOrder(order),
  });
});

const advanceOrderStatus = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.orderId);
  if (!Number.isFinite(orderId)) {
    throw new ApiError(400, "Order id must be a number");
  }

  const order = await Order.findOne({ orderId });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const nextStatus = getNextStatus(order.status);
  order.status = nextStatus;
  order.eta = statusEta(nextStatus);
  await order.save();

  res.status(200).json({
    success: true,
    data: serializeOrder(order),
  });
});

module.exports = {
  listOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  advanceOrderStatus,
};
