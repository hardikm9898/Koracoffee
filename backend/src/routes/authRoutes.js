const express = require("express");

const { requestOtp, verifyOtp, requestAdminOtp, verifyAdminOtp, getCurrentAdmin, logoutAdmin } = require("../controllers/authController");
const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const { authLimiter } = require("../middlewares/rateLimiters");

const router = express.Router();

router.post("/request-otp", authLimiter, requestOtp);
router.post("/verify-otp", authLimiter, verifyOtp);
router.post("/admin/request-otp", authLimiter, requestAdminOtp);
router.post("/admin/verify-otp", authLimiter, verifyAdminOtp);
router.get("/admin/me", protect, requireAdmin, getCurrentAdmin);
router.post("/admin/logout", logoutAdmin);

module.exports = router;
