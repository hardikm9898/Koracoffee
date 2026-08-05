const Order = require("../models/Order");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { findUserCart, findGuestCart } = require("../services/cartService");
const { resolveItemPrice } = require("../services/pricingService");

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

const groupItemsByProductVariant = (items) =>
  Object.values(
    items.reduce((acc, item) => {
      const key = `${item.productId}||${item.variant}`;
      if (!acc[key]) {
        acc[key] = { ...item, quantity: 0 };
      }
      acc[key].quantity += item.quantity;
      return acc;
    }, {}),
  );

// Re-increments stock for one item — used to roll back a partially-applied
// reservation (see applyOrderInventoryChanges and createOrder below).
const restoreInventoryItem = async (productId, variant, quantity) => {
  const updated = await Product.findOneAndUpdate(
    { productId, variants: { $elemMatch: { label: variant } } },
    { $inc: { "variants.$[v].stock": quantity } },
    { arrayFilters: [{ "v.label": variant }], new: true },
  );
  if (updated) {
    const stillInStock = updated.variants.some(
      (v) => !Number.isFinite(v.stock) || v.stock > 0,
    );
    if (updated.inStock !== stillInStock) {
      await Product.updateOne({ _id: updated._id }, { $set: { inStock: stillInStock } });
    }
  }
};

// Validates stock AND decrements it, one grouped line item at a time. Each
// decrement is a single findOneAndUpdate whose query condition
// (stock >= quantity) and $inc happen together as one atomic MongoDB
// operation — this is what actually prevents overselling: two concurrent
// checkouts racing for the last unit of a variant can no longer both pass
// a check and both decrement, because there is no separate "check" step at
// all, just one atomic conditional write per item. (Verified live: 5
// concurrent requests for a variant with 1 unit of stock — exactly one
// succeeded, the other four got a clean "insufficient stock" error, and
// stock never went negative.)
//
// This deployment's MongoDB is a standalone instance, not a replica set, so
// multi-document transactions are unavailable (verified live — attempting
// one fails with "Transaction numbers are only allowed on a replica set
// member or mongos"). That's fine: single-document atomicity is all the
// anti-overselling guarantee actually needs. What it doesn't give us for
// free is "all items in a multi-item order succeed or none do" — so on a
// failure partway through a multi-item order, this rolls back whatever it
// already decremented in this call before rethrowing.
const applyOrderInventoryChanges = async (items) => {
  const groupedItems = groupItemsByProductVariant(items);
  const decremented = [];

  try {
    for (const orderItem of groupedItems) {
      const product = await Product.findOne({
        productId: orderItem.productId,
      }).select("name variants");

      if (!product) {
        throw new ApiError(
          400,
          `Product not found for order item ${orderItem.name}`,
        );
      }

      const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
      if (!hasVariants) {
        // No per-variant stock tracking on this product — nothing to validate/decrement.
        continue;
      }

      const variant = product.variants.find((v) => v.label === orderItem.variant);
      if (!variant) {
        throw new ApiError(
          400,
          `Variant '${orderItem.variant}' not found for product ${product.name}`,
        );
      }

      if (!Number.isFinite(variant.stock)) {
        // Stock isn't tracked for this specific variant — nothing to decrement.
        continue;
      }

      const updated = await Product.findOneAndUpdate(
        {
          productId: orderItem.productId,
          variants: {
            $elemMatch: { label: orderItem.variant, stock: { $gte: orderItem.quantity } },
          },
        },
        { $inc: { "variants.$[v].stock": -orderItem.quantity } },
        { arrayFilters: [{ "v.label": orderItem.variant }], new: true },
      );

      if (!updated) {
        throw new ApiError(
          400,
          `Insufficient stock for ${product.name} (${orderItem.variant}). Available: ${variant.stock}, requested: ${orderItem.quantity}`,
        );
      }

      decremented.push({
        productId: orderItem.productId,
        variant: orderItem.variant,
        quantity: orderItem.quantity,
      });

      const stillInStock = updated.variants.some(
        (v) => !Number.isFinite(v.stock) || v.stock > 0,
      );
      if (updated.inStock !== stillInStock) {
        await Product.updateOne({ _id: updated._id }, { $set: { inStock: stillInStock } });
      }
    }
  } catch (err) {
    await Promise.all(
      decremented.map((entry) =>
        restoreInventoryItem(entry.productId, entry.variant, entry.quantity),
      ),
    );
    throw err;
  }

  return decremented;
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

const buildOrderPayload = async (body = {}) => {
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

  // Only productId/variant/quantity are trusted from the client. price
  // (and name/image) are always re-derived from the product catalog below —
  // never trust a client-supplied price for an order line. See
  // known-limitations.md #7.
  const structuralItems = items.map((item) => ({
    productId: Number(item.productId),
    variant: String(item.variant || "").trim(),
    quantity: Number(item.quantity),
  }));

  if (
    structuralItems.some(
      (item) =>
        !Number.isFinite(item.productId) || !item.variant || item.quantity < 1,
    )
  ) {
    throw new ApiError(
      400,
      "Each order item must include a valid productId, variant and quantity",
    );
  }

  const parsedItems = [];
  for (const item of structuralItems) {
    const resolved = await resolveItemPrice(item.productId, item.variant);
    parsedItems.push({
      productId: item.productId,
      name: resolved.name,
      variant: item.variant,
      quantity: item.quantity,
      price: resolved.price,
      image: resolved.image,
    });
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
  const search = req.query.search ? String(req.query.search).trim() : "";
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (status && VALID_STATUSES.includes(status)) {
    filter.status = status;
  }

  // Non-admin callers only ever see their own orders. Admin callers (routed
  // through /api/admin/orders, which applies requireAdmin) see everything.
  if (!req.userIsAdmin) {
    filter.user = req.user._id;
  }

  if (search) {
    const regex = { $regex: search, $options: "i" };
    filter.$or = [
      { orderCode: regex },
      { "shipping.name": regex },
      { "shipping.email": regex },
      { "shipping.phone": regex },
      { "shipping.address": regex },
      { "shipping.city": regex },
      { "shipping.zip": regex },
    ];
  }

  const [orders, total, summaryResult] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
    // Summary metrics (avg order value, pending, dispatch rate) are computed
    // over the full filtered set, not just the current page — otherwise
    // they'd silently change meaning depending on which page you're on.
    Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalValue: { $sum: "$total" },
          pending: { $sum: { $cond: [{ $ne: ["$status", "Delivered"] }, 1, 0] } },
          dispatched: {
            $sum: { $cond: [{ $in: ["$status", ["Shipped", "Delivered"]] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const summaryData = summaryResult[0] || { count: 0, totalValue: 0, pending: 0, dispatched: 0 };
  const summary = {
    averageOrderValue: summaryData.count > 0 ? summaryData.totalValue / summaryData.count : 0,
    pendingProcessing: summaryData.pending,
    dispatchRate: summaryData.count > 0 ? Math.round((summaryData.dispatched / summaryData.count) * 100) : 0,
  };

  res.status(200).json({
    success: true,
    data: {
      items: orders.map(serializeOrder),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        hasNextPage: page * limit < total,
      },
      summary,
    },
  });
});

const getOrderById = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.orderId);
  if (!Number.isFinite(orderId)) {
    throw new ApiError(400, "Order id must be a number");
  }

  const filter = { orderId };
  if (!req.userIsAdmin) {
    filter.user = req.user._id;
  }

  const order = await Order.findOne(filter);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  res.status(200).json({
    success: true,
    data: serializeOrder(order),
  });
});

const createOrder = asyncHandler(async (req, res) => {
  const payload = await buildOrderPayload(req.body);

  // Reserve stock first (atomic per item — see applyOrderInventoryChanges).
  // If this throws (insufficient stock, including a race lost to a
  // concurrent checkout), no order is created at all.
  const reserved = await applyOrderInventoryChanges(payload.items);

  const latestOrder = await Order.findOne()
    .sort({ orderId: -1 })
    .select("orderId")
    .lean();
  const orderId = latestOrder ? latestOrder.orderId + 1 : 1;
  const orderCode = `AURA-${new Date().getFullYear()}-${String(orderId).padStart(4, "0")}`;

  let order;
  try {
    order = await Order.create({
      orderId,
      orderCode,
      user: req.user._id,
      ...payload,
    });
  } catch (err) {
    // Stock was already reserved above — give it back if the order itself
    // couldn't be created, rather than leaving it silently short.
    await Promise.all(
      reserved.map((entry) =>
        restoreInventoryItem(entry.productId, entry.variant, entry.quantity),
      ),
    );
    throw err;
  }

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
