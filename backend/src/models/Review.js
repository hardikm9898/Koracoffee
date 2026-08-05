const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
      required: true,
      index: true,
    },
    // Optional link to a registered user (not required for guests).
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);

