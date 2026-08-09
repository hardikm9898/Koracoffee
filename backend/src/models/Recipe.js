const mongoose = require("mongoose");

const recipeComponentSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const recipeSchema = new mongoose.Schema(
  {
    // Matches Product.productId (Number), not Product._id — same convention
    // Cart/Order/Review already use for referencing products. See
    // coding-patterns.md.
    product: {
      type: Number,
      required: true,
      index: true,
    },
    // "" means this recipe applies to every variant of the product that
    // doesn't have its own more specific recipe. A non-empty value must
    // match the variant label used at order time (Product.variants[].label,
    // or one of pricingService's fallback labels for products with no
    // explicit variants array — there's nothing in the DB to validate a
    // fallback label against, so this is intentionally free-text).
    variant: {
      type: String,
      trim: true,
      default: "",
    },
    components: {
      type: [recipeComponentSchema],
      required: true,
      validate: [(items) => items.length > 0, "Recipe must include at least one component"],
    },
    active: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

recipeSchema.index({ product: 1, variant: 1, active: 1 });

module.exports = mongoose.model("Recipe", recipeSchema);
