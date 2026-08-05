const express = require("express");
const multer = require("multer");

const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const { bulkUploadProducts } = require("../controllers/adminBulkProductController");
const {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const router = express.Router();

router.use(protect, requireAdmin);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.post("/bulk-upload", upload.single("file"), bulkUploadProducts);
router.get("/", listProducts);
router.get("/:productId", getProductById);
router.post("/", createProduct);
router.patch("/:productId", updateProduct);
router.delete("/:productId", deleteProduct);

module.exports = router;
