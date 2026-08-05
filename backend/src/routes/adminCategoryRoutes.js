const express = require("express");

const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", listCategories);
router.post("/", createCategory);
router.patch("/:id", updateCategory);
router.delete("/:id", deleteCategory);

module.exports = router;
