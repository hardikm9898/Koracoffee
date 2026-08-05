const Category = require("../models/Category");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

const serializeCategory = (category) => ({
  id: String(category._id),
  name: category.name,
  image: String(category.image || "").trim(),
  active: Boolean(category.active),
});

const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort({ name: 1 }).lean();

  res.status(200).json({
    success: true,
    data: categories.map(serializeCategory),
  });
});

const createCategory = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const image = String(req.body.image || "").trim();
  if (!name) {
    throw new ApiError(400, "Category name is required");
  }

  const existing = await Category.findOne({ name }).lean();
  if (existing) {
    throw new ApiError(409, "Category already exists");
  }

  const category = await Category.create({ name, image });
  res.status(201).json({
    success: true,
    data: serializeCategory(category),
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const name = req.body.name !== undefined ? String(req.body.name || "").trim() : undefined;
  const image = req.body.image !== undefined ? String(req.body.image || "").trim() : undefined;
  const active = req.body.active;

  if (name === undefined && image === undefined && active === undefined) {
    throw new ApiError(400, "No updates provided");
  }

  if (name !== undefined && !name) {
    throw new ApiError(400, "Category name cannot be empty");
  }

  if (name) {
    const duplicate = await Category.findOne({ name, _id: { $ne: id } }).lean();
    if (duplicate) {
      throw new ApiError(409, "Category name already exists");
    }
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (image !== undefined) updateData.image = image;
  if (active !== undefined) updateData.active = Boolean(active);

  const category = await Category.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).lean();

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  res.status(200).json({
    success: true,
    data: serializeCategory(category),
  });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id).lean();
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  res.status(200).json({
    success: true,
    data: {
      id: String(category._id),
    },
  });
});

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
