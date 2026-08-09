const express = require("express");

const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const { listExpenses, createExpense, updateExpense, deleteExpense } = require("../controllers/expenseController");

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", listExpenses);
router.post("/", createExpense);
router.patch("/:id", updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;
