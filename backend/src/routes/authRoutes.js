const express = require("express");

const { requestOtp, verifyOtp, requestAdminOtp, verifyAdminOtp, getCurrentAdmin, logoutAdmin } = require("../controllers/authController");
const { protect, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.post("/admin/request-otp", requestAdminOtp);
router.post("/admin/verify-otp", verifyAdminOtp);
router.get("/admin/me", protect, requireAdmin, getCurrentAdmin);
router.post("/admin/logout", logoutAdmin);

module.exports = router;
