const express = require("express");
const { listCategories } = require("../controllers/categoryController");

const router = express.Router();

// Read-only. Mutations require admin auth and live exclusively under
// /api/admin/categories (adminCategoryRoutes.js) — see productRoutes.js for
// why this router must not expose unauthenticated write access.
router.get("/", listCategories);

module.exports = router;
