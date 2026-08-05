const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Review = require("../models/Review");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

const SORT_MAP = {
  featured: { featured: -1, productId: -1 },
  "best-selling": { rating: -1, productId: -1 },
  "name-asc": { name: 1 },
  "name-desc": { name: -1 },
  "price-asc": { basePrice: 1, productId: 1 },
  "price-desc": { basePrice: -1, productId: -1 },
  "date-old": { productId: 1 },
  "date-new": { productId: -1 },
};

const serializeProduct = (product) => ({
  id: product.productId,
  name: product.name,
  category: product.category?.name || "",
  categoryId: product.category?._id ? String(product.category._id) : null,
  basePrice: product.basePrice,
  originalPrice: product.originalPrice,
  inStock: product.inStock,
  rating: product.rating,
  avgRating: product.avgRating ?? null,
  reviewCount: product.reviewCount ?? 0,
  notes: product.notes,
  description: product.description,
  origin: product.origin,
  altitude: product.altitude,
  process: product.process,
  image: product.images && product.images.length > 0 ? product.images[0] : product.image,
  images: product.images && product.images.length > 0 ? product.images : product.image ? [product.image] : [],
  featured: product.featured,
  stats: product.stats,
  serve: product.serve,
  variantAttribute: product.variantAttribute || "Variant",
  variants: Array.isArray(product.variants) ? product.variants : [],
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

const attachReviewSummary = async (products) => {
  const ids = products.map((p) => p.productId).filter((id) => Number.isFinite(id));
  if (ids.length === 0) return products;

  const summaries = await Review.aggregate([
    { $match: { productId: { $in: ids }, status: "approved" } },
    { $group: { _id: "$productId", avgRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
  ]);

  const map = new Map(
    summaries.map((s) => [Number(s._id), { avgRating: Math.round((s.avgRating || 0) * 10) / 10, reviewCount: s.reviewCount || 0 }]),
  );

  return products.map((product) => ({
    ...product,
    ...(map.get(product.productId) || { avgRating: null, reviewCount: 0 }),
  }));
};

const normalizeBoolean = (value) => {
  if (value === undefined) return undefined;
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  throw new ApiError(400, "Boolean query values must be true or false");
};

const parseNumber = (value, fallback) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ApiError(400, "Numeric query values must be valid numbers");
  }

  return parsed;
};

const buildProductPayload = (body = {}, { partial = false } = {}) => {
  const requiredFields = ["name", "category", "basePrice", "notes", "description", "origin"];
  const payload = {};

  if (!partial || body.name !== undefined) payload.name = String(body.name || "").trim();
  if (!partial || body.category !== undefined || body.categoryId !== undefined) {
    payload.category = String(body.categoryId ?? body.category ?? "").trim();
  }
  if (!partial || body.basePrice !== undefined) payload.basePrice = Number(body.basePrice);
  if (body.originalPrice !== undefined) payload.originalPrice = body.originalPrice === null ? null : Number(body.originalPrice);
  if (body.inStock !== undefined) payload.inStock = Boolean(body.inStock);
  if (body.rating !== undefined) payload.rating = Number(body.rating);
  if (!partial || body.notes !== undefined) payload.notes = String(body.notes || "").trim();
  if (!partial || body.description !== undefined) payload.description = String(body.description || "").trim();
  if (!partial || body.origin !== undefined) payload.origin = String(body.origin || "").trim();
  if (body.altitude !== undefined) payload.altitude = String(body.altitude || "").trim();
  if (body.process !== undefined) payload.process = String(body.process || "").trim();
  if (body.variantAttribute !== undefined) payload.variantAttribute = String(body.variantAttribute || "").trim();
  if (body.variants !== undefined) {
    if (!Array.isArray(body.variants)) {
      throw new ApiError(400, "variants must be an array");
    }

    payload.variants = body.variants.map((variant, index) => {
      if (typeof variant !== "object" || variant === null) {
        throw new ApiError(400, `Variant at index ${index} must be an object`);
      }

      const label = String(variant.label || "").trim();
      const price = Number(variant.price);
      const discountPrice = variant.discountPrice === undefined || variant.discountPrice === null
        ? null
        : Number(variant.discountPrice);
      const stock = variant.stock === undefined || variant.stock === null
        ? null
        : Number(variant.stock);

      if (!label) {
        throw new ApiError(400, `Variant label is required for item ${index + 1}`);
      }
      if (!Number.isFinite(price) || price < 0) {
        throw new ApiError(400, `Variant price must be a valid non-negative number for item ${index + 1}`);
      }
      if (discountPrice !== null && (!Number.isFinite(discountPrice) || discountPrice < 0)) {
        throw new ApiError(400, `Variant discountPrice must be a valid non-negative number for item ${index + 1}`);
      }
      if (discountPrice !== null && discountPrice > price) {
        throw new ApiError(400, `Variant discountPrice must not exceed price for item ${index + 1}`);
      }
      if (stock !== null && (!Number.isFinite(stock) || stock < 0)) {
        throw new ApiError(400, `Variant stock must be a valid non-negative number for item ${index + 1}`);
      }

      const variantPayload = {
        label,
        price,
      };

      if (discountPrice !== null) {
        variantPayload.discountPrice = discountPrice;
      }
      if (stock !== null) {
        variantPayload.stock = stock;
      }

      return variantPayload;
    });
  }
  if (body.images !== undefined) {
    const images = Array.isArray(body.images)
      ? body.images.map((item) => String(item).trim()).filter(Boolean)
      : [String(body.images).trim()].filter(Boolean);
    payload.images = images;
    if (images.length > 0) {
      payload.image = images[0];
    } else if (!partial) {
      payload.image = null;
    }
  }

  if (body.image !== undefined) {
    const imageValue = body.image ? String(body.image).trim() : null;
    payload.image = imageValue;
    if (body.images === undefined) {
      payload.images = imageValue ? [imageValue] : [];
    }
  }

  if (body.featured !== undefined) payload.featured = Boolean(body.featured);
  if (body.stats !== undefined) payload.stats = body.stats;
  if (body.serve !== undefined) payload.serve = body.serve;

  for (const field of requiredFields) {
    if (!partial && !payload[field] && payload[field] !== 0) {
      throw new ApiError(400, `${field} is required`);
    }
  }

  if (payload.basePrice !== undefined && (!Number.isFinite(payload.basePrice) || payload.basePrice < 0)) {
    throw new ApiError(400, "basePrice must be a valid positive number");
  }

  if (payload.category !== undefined && payload.category !== null && payload.category !== "" && !mongoose.Types.ObjectId.isValid(payload.category)) {
    throw new ApiError(400, "category must be a valid category id");
  }

  if (payload.originalPrice !== undefined && payload.originalPrice !== null) {
    if (!Number.isFinite(payload.originalPrice) || payload.originalPrice < 0) {
      throw new ApiError(400, "originalPrice must be a valid positive number");
    }
  }

  if (payload.rating !== undefined && (!Number.isFinite(payload.rating) || payload.rating < 0 || payload.rating > 5)) {
    throw new ApiError(400, "rating must be between 0 and 5");
  }

  return payload;
};

const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(parseNumber(req.query.page, 1), 1);
  const limit = Math.min(Math.max(parseNumber(req.query.limit, 10), 1), 30);
  const category = req.query.category ? String(req.query.category).trim() : "";
  const search = req.query.search ? String(req.query.search).trim() : "";
  const inStock = normalizeBoolean(req.query.inStock);
  const minPrice = parseNumber(req.query.minPrice, 0);
  const maxPrice = parseNumber(req.query.maxPrice, Number.MAX_SAFE_INTEGER);
  const sort = SORT_MAP[req.query.sort] ? req.query.sort : "featured";

  const categories = await Category.find().sort({ name: 1 }).select("name").lean();
  const filter = {
    basePrice: { $gte: minPrice, $lte: maxPrice },
  };

  if (category && category !== "All") {
    if (mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    } else {
      const categoryDoc = await Category.findOne({ name: category }).select("_id").lean();
      if (!categoryDoc) {
        return res.status(200).json({
          success: true,
          data: {
            items: [],
            filters: {
              categories: categories.map((item) => item.name),
            },
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 1,
              hasNextPage: false,
            },
          },
        });
      }
      filter.category = categoryDoc._id;
    }
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { notes: { $regex: search, $options: "i" } },
      { origin: { $regex: search, $options: "i" } },
    ];
  }

  if (inStock !== undefined) {
    filter.inStock = inStock;
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(SORT_MAP[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("category", "name"),
    Product.countDocuments(filter),
  ]);

  const withSummary = await attachReviewSummary(items.map((item) => item.toObject ? item.toObject() : item));

  res.status(200).json({
    success: true,
    data: {
      items: withSummary.map(serializeProduct),
      filters: {
        categories: categories.map((item) => item.name),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        hasNextPage: page * limit < total,
      },
    },
  });
});

const getProductById = asyncHandler(async (req, res) => {
  const productId = Number(req.params.productId);

  if (!Number.isFinite(productId)) {
    throw new ApiError(400, "Product id must be a number");
  }

  const product = await Product.findOne({ productId }).populate("category", "name");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const [summary] = await Review.aggregate([
    { $match: { productId, status: "approved" } },
    { $group: { _id: "$productId", avgRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
  ]);

  const productObject = product.toObject();
  productObject.avgRating = summary?.avgRating ? Math.round(summary.avgRating * 10) / 10 : null;
  productObject.reviewCount = summary?.reviewCount || 0;

  res.status(200).json({
    success: true,
    data: serializeProduct(productObject),
  });
});

const createProduct = asyncHandler(async (req, res) => {
  const rawId = req.body.id ?? req.body.productId;
  let productId;

  if (rawId !== undefined && rawId !== null && rawId !== "") {
    productId = Number(rawId);
    if (!Number.isFinite(productId) || productId <= 0) {
      throw new ApiError(400, "productId must be a valid positive number");
    }
  } else {
    const latestProduct = await Product.findOne().sort({ productId: -1 }).select("productId").lean();
    productId = latestProduct ? latestProduct.productId + 1 : 1;
  }

  const existingProduct = await Product.findOne({ productId });
  if (existingProduct) {
    throw new ApiError(409, "A product with this productId already exists");
  }

  const payload = buildProductPayload(req.body);
  if (!payload.category) {
    throw new ApiError(400, "category is required");
  }

  const categoryExists = await Category.exists({ _id: payload.category });
  if (!categoryExists) {
    throw new ApiError(400, "Selected category does not exist");
  }

  const product = await Product.create({ ...payload, productId });
  await product.populate("category", "name");

  res.status(201).json({
    success: true,
    data: serializeProduct(product),
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const productId = Number(req.params.productId);
  if (!Number.isFinite(productId)) {
    throw new ApiError(400, "Product id must be a number");
  }

  const payload = buildProductPayload(req.body, { partial: true });
  if (payload.category) {
    const categoryExists = await Category.exists({ _id: payload.category });
    if (!categoryExists) {
      throw new ApiError(400, "Selected category does not exist");
    }
  }

  const product = await Product.findOneAndUpdate({ productId }, payload, {
    new: true,
    runValidators: true,
  }).populate("category", "name");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  res.status(200).json({
    success: true,
    data: serializeProduct(product),
  });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const productId = Number(req.params.productId);
  if (!Number.isFinite(productId)) {
    throw new ApiError(400, "Product id must be a number");
  }

  const product = await Product.findOneAndDelete({ productId });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
  });
});

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
