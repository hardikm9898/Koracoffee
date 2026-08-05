const Cart = require("../models/Cart");

const mapCartItem = (item) => ({
  id: item.productId,
  name: item.name,
  basePrice: item.basePrice,
  price: item.price,
  quantity: item.quantity,
  variant: item.variant,
  image: item.image || undefined,
});

const serializeCart = (cart) => {
  const items = cart.items.map(mapCartItem);
  const cartTotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = items.reduce((total, item) => total + item.quantity, 0);

  return {
    id: cart._id,
    userId: cart.user || null,
    sessionId: cart.sessionId || null,
    items,
    cartTotal,
    cartCount,
    updatedAt: cart.updatedAt,
  };
};

const mergeItems = (baseItems = [], incomingItems = []) => {
  const merged = [...baseItems];

  for (const incomingItem of incomingItems) {
    const existingIndex = merged.findIndex(
      (item) =>
        item.productId === incomingItem.productId && item.variant === incomingItem.variant
    );

    if (existingIndex >= 0) {
      merged[existingIndex].quantity += incomingItem.quantity;
      merged[existingIndex].price = incomingItem.price;
      merged[existingIndex].basePrice = incomingItem.basePrice;
      merged[existingIndex].name = incomingItem.name;
      merged[existingIndex].image = incomingItem.image || null;
    } else {
      merged.push({ ...incomingItem });
    }
  }

  return merged;
};

const findGuestCart = (sessionId) => Cart.findOne({ sessionId, user: null });
const findUserCart = (userId) => Cart.findOne({ user: userId });

const createGuestCart = (sessionId) =>
  Cart.create({
    sessionId,
    items: [],
  });

const createUserCart = (userId) =>
  Cart.create({
    user: userId,
    items: [],
  });

module.exports = {
  serializeCart,
  mergeItems,
  findGuestCart,
  findUserCart,
  createGuestCart,
  createUserCart,
};
