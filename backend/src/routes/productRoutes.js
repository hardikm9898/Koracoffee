const express = require("express");

const {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const router = express.Router();

router.get("/", listProducts);
router.get("/:productId", getProductById);
router.post("/", createProduct);
router.patch("/:productId", updateProduct);
router.delete("/:productId", deleteProduct);

module.exports = router;
