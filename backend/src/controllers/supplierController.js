const Supplier = require("../models/Supplier");
const InventoryItem = require("../models/InventoryItem");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

const serializeSupplier = (supplier) => ({
  id: String(supplier._id),
  name: supplier.name,
  contactName: supplier.contactName,
  phone: supplier.phone,
  email: supplier.email,
  address: supplier.address,
  gstNumber: supplier.gstNumber,
  paymentTerms: supplier.paymentTerms,
  active: supplier.active,
  notes: supplier.notes,
  createdAt: supplier.createdAt,
  updatedAt: supplier.updatedAt,
});

const listSuppliers = asyncHandler(async (req, res) => {
  const { active, search } = req.query;
  const filter = {};

  if (active === "true" || active === "false") {
    filter.active = active === "true";
  }
  if (search) {
    const regex = { $regex: String(search).trim(), $options: "i" };
    filter.$or = [{ name: regex }, { contactName: regex }, { phone: regex }, { email: regex }];
  }

  const suppliers = await Supplier.find(filter).sort({ name: 1 });
  res.status(200).json({ success: true, data: suppliers.map(serializeSupplier) });
});

const getSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw new ApiError(404, "Supplier not found");
  res.status(200).json({ success: true, data: serializeSupplier(supplier) });
});

const createSupplier = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) throw new ApiError(400, "Supplier name is required");

  const supplier = await Supplier.create({
    name,
    contactName: String(req.body.contactName || "").trim(),
    phone: String(req.body.phone || "").trim(),
    email: String(req.body.email || "").trim(),
    address: String(req.body.address || "").trim(),
    gstNumber: String(req.body.gstNumber || "").trim(),
    paymentTerms: String(req.body.paymentTerms || "").trim(),
    notes: String(req.body.notes || "").trim(),
  });

  res.status(201).json({ success: true, data: serializeSupplier(supplier) });
});

const updateSupplier = asyncHandler(async (req, res) => {
  const editable = [
    "name",
    "contactName",
    "phone",
    "email",
    "address",
    "gstNumber",
    "paymentTerms",
    "active",
    "notes",
  ];
  const updateData = {};
  for (const field of editable) {
    if (req.body[field] !== undefined) {
      updateData[field] = typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
    }
  }

  if (updateData.name === "") {
    throw new ApiError(400, "Supplier name cannot be empty");
  }

  const supplier = await Supplier.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });
  if (!supplier) throw new ApiError(404, "Supplier not found");

  res.status(200).json({ success: true, data: serializeSupplier(supplier) });
});

const deleteSupplier = asyncHandler(async (req, res) => {
  const referencingItems = await InventoryItem.countDocuments({ supplier: req.params.id });
  if (referencingItems > 0) {
    throw new ApiError(
      409,
      `Cannot delete this supplier — ${referencingItems} inventory item${referencingItems === 1 ? "" : "s"} still reference it. Reassign or remove those first.`,
    );
  }

  const supplier = await Supplier.findByIdAndDelete(req.params.id);
  if (!supplier) throw new ApiError(404, "Supplier not found");

  res.status(200).json({ success: true, data: { id: String(supplier._id) } });
});

module.exports = {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
