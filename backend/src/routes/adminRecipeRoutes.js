const express = require("express");

const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const {
  listRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} = require("../controllers/recipeController");

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", listRecipes);
router.get("/:id", getRecipe);
router.post("/", createRecipe);
router.patch("/:id", updateRecipe);
router.delete("/:id", deleteRecipe);

module.exports = router;
