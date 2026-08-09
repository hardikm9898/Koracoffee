const Expense = require("../models/Expense");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { EXPENSE_CATEGORIES } = require("../models/Expense");

const serializeExpense = (expense) => ({
  id: String(expense._id),
  category: expense.category,
  amount: expense.amount,
  date: expense.date,
  vendor: expense.vendor,
  reference: expense.reference,
  paymentMethod: expense.paymentMethod,
  notes: expense.notes,
  order: expense.order ? String(expense.order) : null,
  adminPhone: expense.adminPhone,
  createdAt: expense.createdAt,
  updatedAt: expense.updatedAt,
});

const listExpenses = asyncHandler(async (req, res) => {
  const { category, dateFrom, dateTo } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const skip = (page - 1) * limit;

  const filter = {};
  if (category && EXPENSE_CATEGORIES.includes(category)) filter.category = category;
  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo);
  }

  const [expenses, total, totalAgg] = await Promise.all([
    Expense.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
    Expense.countDocuments(filter),
    Expense.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: expenses.map(serializeExpense),
      totalAmount: totalAgg[0]?.total || 0,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    },
  });
});

const createExpense = asyncHandler(async (req, res) => {
  const category = String(req.body.category || "").trim();
  const amount = Number(req.body.amount);

  if (!EXPENSE_CATEGORIES.includes(category)) {
    throw new ApiError(400, `category must be one of: ${EXPENSE_CATEGORIES.join(", ")}`);
  }
  if (!Number.isFinite(amount) || amount < 0) {
    throw new ApiError(400, "amount must be a valid non-negative number");
  }

  const expense = await Expense.create({
    category,
    amount,
    date: req.body.date ? new Date(req.body.date) : new Date(),
    vendor: String(req.body.vendor || "").trim(),
    reference: String(req.body.reference || "").trim(),
    paymentMethod: String(req.body.paymentMethod || "").trim(),
    notes: String(req.body.notes || "").trim(),
    order: req.body.order || null,
    adminPhone: req.user?.phoneNumber || "",
  });

  res.status(201).json({ success: true, data: serializeExpense(expense) });
});

const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw new ApiError(404, "Expense not found");

  if (req.body.category !== undefined) {
    if (!EXPENSE_CATEGORIES.includes(req.body.category)) {
      throw new ApiError(400, `category must be one of: ${EXPENSE_CATEGORIES.join(", ")}`);
    }
    expense.category = req.body.category;
  }
  if (req.body.amount !== undefined) {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new ApiError(400, "amount must be a valid non-negative number");
    }
    expense.amount = amount;
  }
  if (req.body.date !== undefined) expense.date = new Date(req.body.date);
  for (const field of ["vendor", "reference", "paymentMethod", "notes"]) {
    if (req.body[field] !== undefined) expense[field] = String(req.body[field]).trim();
  }

  await expense.save();
  res.status(200).json({ success: true, data: serializeExpense(expense) });
});

const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) throw new ApiError(404, "Expense not found");
  res.status(200).json({ success: true, data: { id: String(expense._id) } });
});

module.exports = {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
};
