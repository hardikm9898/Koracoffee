const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");

// Mirrors the customer frontend's fallback variant system
// (front-end/frontend/src/lib/data.ts `VARIANTS`) for products that don't
// define their own Product.variants in the database. Keep both in sync if
// this multiplier table ever changes.
const FALLBACK_VARIANTS = [
  { label: "100g", multiplier: 0.5 },
  { label: "250g", multiplier: 1.0 },
  { label: "500g", multiplier: 1.8 },
];

/**
 * Resolves the authoritative price for a (productId, variant label) pair
 * directly from the database. Never trust a client-supplied price for a
 * cart item or order line — always resolve it here instead.
 */
const resolveItemPrice = async (productId, variantLabel) => {
  const product = await Product.findOne({ productId }).select(
    "name image images basePrice variants",
  );

  if (!product) {
    throw new ApiError(400, `Product ${productId} not found`);
  }

  const label = String(variantLabel || "").trim();
  const image = (product.images && product.images[0]) || product.image || null;

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const variant = product.variants.find((entry) => entry.label === label);
    if (!variant) {
      throw new ApiError(
        400,
        `Variant '${label}' not found for product ${product.name}`,
      );
    }

    const price =
      Number.isFinite(variant.discountPrice) && variant.discountPrice !== null
        ? variant.discountPrice
        : variant.price;

    return { price, name: product.name, image };
  }

  const fallback = FALLBACK_VARIANTS.find((entry) => entry.label === label);
  if (!fallback) {
    throw new ApiError(
      400,
      `Variant '${label}' not found for product ${product.name}`,
    );
  }

  return {
    price: Math.round(product.basePrice * fallback.multiplier * 100) / 100,
    name: product.name,
    image,
  };
};

module.exports = { resolveItemPrice, FALLBACK_VARIANTS };
