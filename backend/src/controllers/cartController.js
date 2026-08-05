const Cart = require("../models/Cart");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const {
  serializeCart,
  mergeItems,
  findGuestCart,
  findUserCart,
  createGuestCart,
  createUserCart,
} = require("../services/cartService");
const { resolveItemPrice } = require("../services/pricingService");

const normalizeSessionId = (value = "") => String(value).trim();

const extractSessionIdFromReq = (req) =>
  normalizeSessionId(
    req.body?.sessionId ||
      req.query?.sessionId ||
      req.headers["x-session-id"] ||
      "",
  );

// Only structural fields are trusted from the client. Price, name, and
// image are always re-derived server-side via resolveItemPrice() — never
// trust a client-supplied price for a cart item. See known-limitations.md #7.
const normalizeItemPayload = (item = {}) => {
  const normalized = {
    productId: Number(item.id),
    quantity: Number(item.quantity),
    variant: String(item.variant || "").trim(),
  };

  if (!Number.isFinite(normalized.productId)) {
    throw new ApiError(400, "Product id is required");
  }

  if (!Number.isFinite(normalized.quantity) || normalized.quantity < 1) {
    throw new ApiError(400, "Quantity must be at least 1");
  }

  if (!normalized.variant) {
    throw new ApiError(400, "Variant is required");
  }

  return normalized;
};

const getOrCreateCart = async ({ userId, sessionId }) => {
  if (userId) {
    return (await findUserCart(userId)) || createUserCart(userId);
  }

  if (!sessionId) {
    throw new ApiError(400, "Session id is required for guest cart");
  }

  return (await findGuestCart(sessionId)) || createGuestCart(sessionId);
};

const getCart = asyncHandler(async (req, res) => {
  const sessionId = extractSessionIdFromReq(req);
  const userId = req.user?._id;
  const cart = await getOrCreateCart({ userId, sessionId });

  res.status(200).json({
    success: true,
    data: serializeCart(cart),
  });
});

const addCartItem = asyncHandler(async (req, res) => {
  const sessionId = extractSessionIdFromReq(req);
  const userId = req.user?._id;
  const incomingItem = normalizeItemPayload(req.body.item);
  const resolved = await resolveItemPrice(
    incomingItem.productId,
    incomingItem.variant,
  );
  const cart = await getOrCreateCart({ userId, sessionId });

  const existingIndex = cart.items.findIndex(
    (item) =>
      item.productId === incomingItem.productId &&
      item.variant === incomingItem.variant,
  );

  if (existingIndex >= 0) {
    cart.items[existingIndex].quantity += incomingItem.quantity;
    cart.items[existingIndex].price = resolved.price;
    cart.items[existingIndex].basePrice = resolved.price;
    cart.items[existingIndex].name = resolved.name;
    cart.items[existingIndex].image = resolved.image;
  } else {
    cart.items.push({
      productId: incomingItem.productId,
      variant: incomingItem.variant,
      quantity: incomingItem.quantity,
      price: resolved.price,
      basePrice: resolved.price,
      name: resolved.name,
      image: resolved.image,
    });
  }

  await cart.save();

  res.status(200).json({
    success: true,
    message: "Item added to cart",
    data: serializeCart(cart),
  });
});

const updateCartItem = asyncHandler(async (req, res) => {
  const sessionId = extractSessionIdFromReq(req);
  const userId = req.user?._id;
  const productId = Number(req.body.productId);
  const variant = String(req.body.variant || "").trim();
  const quantity = Number(req.body.quantity);
  const cart = await getOrCreateCart({ userId, sessionId });

  if (!Number.isFinite(productId)) {
    throw new ApiError(400, "Product id is required");
  }

  if (!variant) {
    throw new ApiError(400, "Variant is required");
  }

  const existingItem = cart.items.find(
    (item) => item.productId === productId && item.variant === variant,
  );

  if (!existingItem) {
    throw new ApiError(404, "Cart item not found");
  }

  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new ApiError(400, "Quantity must be at least 1");
  }

  existingItem.quantity = quantity;
  await cart.save();

  res.status(200).json({
    success: true,
    message: "Cart item updated",
    data: serializeCart(cart),
  });
});

const removeCartItem = asyncHandler(async (req, res) => {
  const sessionId = extractSessionIdFromReq(req);
  const userId = req.user?._id;
  const productId = Number(req.body.productId);
  const variant = String(req.body.variant || "").trim();
  const cart = await getOrCreateCart({ userId, sessionId });

  if (!Number.isFinite(productId)) {
    throw new ApiError(400, "Product id is required");
  }

  if (!variant) {
    throw new ApiError(400, "Variant is required");
  }

  cart.items = cart.items.filter(
    (item) => !(item.productId === productId && item.variant === variant),
  );
  await cart.save();

  res.status(200).json({
    success: true,
    message: "Cart item removed",
    data: serializeCart(cart),
  });
});

const attachSessionCart = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const sessionId = extractSessionIdFromReq(req);

  if (!sessionId) {
    throw new ApiError(400, "Session id is required");
  }

  const [guestCart, userCart] = await Promise.all([
    findGuestCart(sessionId),
    findUserCart(userId),
  ]);

  let targetCart = userCart;

  if (!targetCart) {
    targetCart = await createUserCart(userId);
  }

  if (guestCart) {
    targetCart.items = mergeItems(targetCart.items, guestCart.items);
    await targetCart.save();
    await Cart.deleteOne({ _id: guestCart._id });
  }

  res.status(200).json({
    success: true,
    message: "Guest cart attached to user account",
    data: serializeCart(targetCart),
  });
});

const clearCart = asyncHandler(async (req, res) => {
  const sessionId = extractSessionIdFromReq(req);
  const userId = req.user?._id;
  const cart = await getOrCreateCart({ userId, sessionId });

  cart.items = [];
  await cart.save();

  res.status(200).json({
    success: true,
    message: "Cart cleared",
    data: serializeCart(cart),
  });
});

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  attachSessionCart,
  clearCart,
};
