const express = require("express");

const { listProducts, getProductById } = require("../controllers/productController");

const router = express.Router();

// Read-only. Mutations (create/update/delete) require admin auth and live
// exclusively under /api/admin/products (adminProductRoutes.js) — this
// router previously also exposed unauthenticated create/update/delete here,
// which allowed anyone to modify the catalog with no login. Do not re-add
// mutation routes here; extend adminProductRoutes.js instead.
router.get("/", listProducts);
router.get("/:productId", getProductById);

module.exports = router;
