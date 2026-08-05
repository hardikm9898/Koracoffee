const express = require("express");

const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} = require("../controllers/adminCouponController");

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", listCoupons);
router.post("/", createCoupon);
router.patch("/:id", updateCoupon);
router.delete("/:id", deleteCoupon);

module.exports = router;
