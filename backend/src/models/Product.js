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

// Matches the actual filter shape productController.listProducts builds
// (category + price range + inStock, in that order of selectivity) — lets
// MongoDB use one index for that combination instead of scanning. The free
// text search (name/notes/origin) is deliberately left as an unindexed
// regex rather than converted to a $text index: $text does word/stem
// matching, not substring matching, so "ken" would stop matching "Kenya" —
// a real search-as-you-type UX regression not worth it for this catalog's
// current size. Revisit if the catalog grows enough for that regex scan to
// actually matter — see project-context/known-limitations.md.
productSchema.index({ category: 1, basePrice: 1, inStock: 1 });

module.exports = mongoose.model("Product", productSchema);
