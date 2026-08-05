const express = require("express");

const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const { listAuditLog } = require("../controllers/adminAuditLogController");

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", listAuditLog);

module.exports = router;
