const mongoose = require("mongoose");

const flavorStatsSchema = new mongoose.Schema(
  {
    acidity: { type: Number, default: 3, min: 1, max: 5 },
    body: { type: Number, default: 3, min: 1, max: 5 },
    sweetness: { type: Number, default: 3, min: 1, max: 5 },
    complexity: { type: Number, default: 3, min: 1, max: 5 },
    finish: { type: Number, default: 3, min: 1, max: 5 },
  },
  { _id: false },
);

const serveGuideSchema = new mongoose.Schema(
  {
    vessel: { type: String, default: "" },
    grind: { type: String, default: "" },
    temp: { type: String, default: "" },
    time: { type: String, default: "" },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      default: null,
      min: 0,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },
    notes: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    origin: {
      type: String,
      required: true,
      trim: true,
    },
    altitude: {
      type: String,
      default: "",
      trim: true,
    },
    process: {
      type: String,
      default: "",
      trim: true,
    },
    image: {
      type: String,
      default: null,
      trim: true,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    featured: {
      type: Boolean,
      default: false,
    },
    stats: {
      type: flavorStatsSchema,
      default: () => ({}),
    },
    serve: {
      type: serveGuideSchema,
      default: () => ({}),
    },
    variantAttribute: {
      type: String,
      trim: true,
      default: "Variant",
    },
    variants: {
      type: [
        {
          label: { type: String, required: true, trim: true },
          price: { type: Number, required: true, min: 0 },
          discountPrice: { type: Number, default: null, min: 0 },
          stock: { type: Number, default: 0, min: 0 },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Product", productSchema);
