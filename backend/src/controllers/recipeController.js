const Recipe = require("../models/Recipe");
const Product = require("../models/Product");
const InventoryItem = require("../models/InventoryItem");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { computeRecipeCost } = require("../services/recipeService");

const serializeRecipe = (recipe, productName) => {
  const { totalCost, breakdown } = computeRecipeCost(recipe);
  return {
    id: String(recipe._id),
    product: recipe.product,
    productName: productName || null,
    variant: recipe.variant,
    components: breakdown,
    estimatedCost: totalCost,
    active: recipe.active,
    notes: recipe.notes,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
  };
};

const attachProductNames = async (recipes) => {
  const productIds = [...new Set(recipes.map((r) => r.product))];
  const products = await Product.find({ productId: { $in: productIds } }).select("productId name").lean();
  const nameByProductId = new Map(products.map((p) => [p.productId, p.name]));
  return recipes.map((recipe) => serializeRecipe(recipe, nameByProductId.get(recipe.product)));
};

const validateComponents = async (rawComponents) => {
  if (!Array.isArray(rawComponents) || rawComponents.length === 0) {
    throw new ApiError(400, "Recipe must include at least one component");
  }

  const components = [];
  for (const raw of rawComponents) {
    const itemId = Number(raw.itemId);
    const quantity = Number(raw.quantity);
    if (!Number.isFinite(itemId) || !Number.isFinite(quantity) || quantity <= 0) {
      throw new ApiError(400, "Each recipe component needs a valid itemId and a positive quantity");
    }
    const inventoryItem = await InventoryItem.findOne({ itemId }).select("_id").lean();
    if (!inventoryItem) {
      throw new ApiError(400, `Inventory item #${itemId} not found`);
    }
    components.push({ item: inventoryItem._id, quantity });
  }

  return components;
};

const listRecipes = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.product) filter.product = Number(req.query.product);
  if (req.query.active === "true" || req.query.active === "false") {
    filter.active = req.query.active === "true";
  }

  const recipes = await Recipe.find(filter)
    .populate("components.item", "name sku unit avgCost currentStock")
    .sort({ product: 1, variant: 1 });

  res.status(200).json({ success: true, data: await attachProductNames(recipes) });
});

const getRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id).populate(
    "components.item",
    "name sku unit avgCost currentStock",
  );
  if (!recipe) throw new ApiError(404, "Recipe not found");

  const [serialized] = await attachProductNames([recipe]);
  res.status(200).json({ success: true, data: serialized });
});

const createRecipe = asyncHandler(async (req, res) => {
  const productId = Number(req.body.product);
  if (!Number.isFinite(productId)) throw new ApiError(400, "A valid product id is required");

  const product = await Product.findOne({ productId }).select("name").lean();
  if (!product) throw new ApiError(400, `Product #${productId} not found`);

  const variant = String(req.body.variant || "").trim();
  const components = await validateComponents(req.body.components);

  const existing = await Recipe.findOne({ product: productId, variant, active: true }).lean();
  if (existing) {
    throw new ApiError(
      400,
      variant
        ? `An active recipe already exists for this product's "${variant}" variant — edit or deactivate it first.`
        : "An active product-wide recipe already exists for this product — edit or deactivate it first.",
    );
  }

  const recipe = await Recipe.create({
    product: productId,
    variant,
    components,
    notes: req.body.notes ? String(req.body.notes).trim() : "",
  });

  const populated = await Recipe.findById(recipe._id).populate("components.item", "name sku unit avgCost currentStock");
  res.status(201).json({ success: true, data: serializeRecipe(populated, product.name) });
});

const updateRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) throw new ApiError(404, "Recipe not found");

  if (req.body.components !== undefined) {
    recipe.components = await validateComponents(req.body.components);
  }
  if (req.body.variant !== undefined) {
    recipe.variant = String(req.body.variant).trim();
  }
  if (req.body.active !== undefined) {
    recipe.active = Boolean(req.body.active);
  }
  if (req.body.notes !== undefined) {
    recipe.notes = String(req.body.notes).trim();
  }

  await recipe.save();
  const populated = await Recipe.findById(recipe._id).populate("components.item", "name sku unit avgCost currentStock");
  const product = await Product.findOne({ productId: recipe.product }).select("name").lean();
  res.status(200).json({ success: true, data: serializeRecipe(populated, product?.name) });
});

const deleteRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findByIdAndDelete(req.params.id);
  if (!recipe) throw new ApiError(404, "Recipe not found");
  res.status(200).json({ success: true, data: { id: String(recipe._id) } });
});

module.exports = {
  listRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
};
