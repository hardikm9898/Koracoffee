const express = require("express");
const { validateCoupon, listActiveCoupons } = require("../controllers/couponController");

const router = express.Router();

router.get("/validate", validateCoupon);
router.get("/", listActiveCoupons);

module.exports = router;
