const express = require("express");

const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const {
  listItems,
  getItem,
  createItem,
  updateItem,
  adjustStock,
  listLedger,
  getDashboard,
} = require("../controllers/inventoryController");

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/dashboard", getDashboard);
router.get("/ledger", listLedger);
router.get("/items", listItems);
router.get("/items/:itemId", getItem);
router.post("/items", createItem);
router.patch("/items/:itemId", updateItem);
router.post("/items/:itemId/adjust", adjustStock);

module.exports = router;
