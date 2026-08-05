const express = require("express");
const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const { getAdminReviews, approveReview, deleteReview } = require("../controllers/adminReviewController");

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", getAdminReviews);
router.patch("/:reviewId/approve", approveReview);
router.delete("/:reviewId", deleteReview);

module.exports = router;

