const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const Review = require("../models/Review");
const Product = require("../models/Product");

const normalizeString = (value) => String(value || "").trim();

const serializeReview = (review) => ({
  id: String(review._id),
  productId: review.productId,
  name: review.name,
  rating: review.rating,
  content: review.content,
  images: Array.isArray(review.images) ? review.images : [],
  createdAt: review.createdAt,
});

const createReview = asyncHandler(async (req, res) => {
  const productId = Number(req.body.productId);
  if (!Number.isFinite(productId)) {
    throw new ApiError(400, "productId must be a number");
  }

  const productExists = await Product.exists({ productId });
  if (!productExists) {
    throw new ApiError(404, "Product not found");
  }

  const name = normalizeString(req.body.name);
  const phoneNumber = normalizeString(req.body.phoneNumber);
  const content = normalizeString(req.body.content);
  const rating = Number(req.body.rating);

  if (!name) throw new ApiError(400, "name is required");
  if (!content) throw new ApiError(400, "content is required");
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new ApiError(400, "rating must be between 1 and 5");
  }

  const images = Array.isArray(req.files)
    ? req.files.map((file) => `${req.protocol}://${req.get("host")}/uploads/reviews/${file.filename}`)
    : [];

  const review = await Review.create({
    productId,
    user: req.user?._id || null,
    name,
    phoneNumber,
    rating,
    content,
    images,
    status: "pending",
  });

  res.status(201).json({
    success: true,
    data: {
      message: "Review submitted for moderation",
      review: serializeReview(review),
    },
  });
});

const listApprovedReviews = asyncHandler(async (req, res) => {
  const productId = Number(req.query.productId);
  if (!Number.isFinite(productId)) {
    throw new ApiError(400, "productId query is required");
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

  const [reviews, summary] = await Promise.all([
    Review.find({ productId, status: "approved" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Review.aggregate([
      { $match: { productId, status: "approved" } },
      { $group: { _id: "$productId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]),
  ]);

  const avgRating = summary[0]?.avgRating ? Math.round(summary[0].avgRating * 10) / 10 : 0;
  const reviewCount = summary[0]?.count || 0;

  res.status(200).json({
    success: true,
    data: {
      avgRating,
      reviewCount,
      items: reviews.map(serializeReview),
    },
  });
});

module.exports = {
  createReview,
  listApprovedReviews,
};

