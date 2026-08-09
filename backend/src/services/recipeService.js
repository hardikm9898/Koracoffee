const Recipe = require("../models/Recipe");

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

// A variant-specific recipe wins over the product-wide ("" variant)
// fallback recipe, if both exist. Used both for the live cost estimate
// shown on the Recipes page and — in Phase 4 — for resolving what to
// consume when an order moves to Packaging.
const resolveRecipe = async (productId, variant) => {
  const label = String(variant || "").trim();

  const specific = label
    ? await Recipe.findOne({ product: productId, variant: label, active: true }).populate(
        "components.item",
        "name sku type unit avgCost currentStock",
      )
    : null;
  if (specific) return specific;

  return Recipe.findOne({ product: productId, variant: "", active: true }).populate(
    "components.item",
    "name sku type unit avgCost currentStock",
  );
};

// Live estimate from current avgCost — not a stored/cached figure, since
// avgCost drifts with every purchase. Actual per-order COGS (Phase 4) is
// computed separately at consumption time, snapshotting whatever the cost
// actually was then, so this estimate updating over time doesn't rewrite
// historical order costs.
const computeRecipeCost = (recipe) => {
  const breakdown = recipe.components.map((component) => {
    const item = component.item;
    const unitCost = item?.avgCost || 0;
    const cost = round2(unitCost * component.quantity);
    return {
      item: item ? String(item._id) : null,
      name: item?.name || null,
      sku: item?.sku || null,
      unit: item?.unit || null,
      quantity: component.quantity,
      unitCost,
      cost,
    };
  });

  return {
    totalCost: round2(breakdown.reduce((sum, line) => sum + line.cost, 0)),
    breakdown,
  };
};

module.exports = { resolveRecipe, computeRecipeCost };
