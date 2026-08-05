const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const Review = require("../models/Review");

const sanitize = (review) => ({
  id: String(review._id),
  productId: review.productId,
  name: review.name,
  phoneNumber: review.phoneNumber,
  rating: review.rating,
  content: review.content,
  images: Array.isArray(review.images) ? review.images : [],
  status: review.status,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
});

const getAdminReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
  const skip = (page - 1) * limit;
  const status = req.query.status ? String(req.query.status).trim().toLowerCase() : "pending";
  const productId = req.query.productId !== undefined && req.query.productId !== ""
    ? Number(req.query.productId)
    : null;

  const filter = {};
  if (status === "pending" || status === "approved") {
    filter.status = status;
  }
  if (productId !== null) {
    if (!Number.isFinite(productId)) throw new ApiError(400, "productId must be a number");
    filter.productId = productId;
  }

  const [items, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Review.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: items.map(sanitize),
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

const approveReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const review = await Review.findByIdAndUpdate(
    reviewId,
    { status: "approved" },
    { new: true, runValidators: true },
  ).lean();

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  res.status(200).json({
    success: true,
    data: sanitize(review),
  });
});

const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const review = await Review.findByIdAndDelete(reviewId);
  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  res.status(200).json({
    success: true,
    message: "Review deleted successfully",
  });
});

module.exports = {
  getAdminReviews,
  approveReview,
  deleteReview,
};

