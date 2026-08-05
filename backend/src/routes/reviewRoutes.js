const express = require("express");

const { createReview, listApprovedReviews } = require("../controllers/reviewController");
const { createImageUploader } = require("../utils/imageUpload");

const upload = createImageUploader("reviews");

const router = express.Router();

router.get("/", listApprovedReviews);
router.post("/", upload.array("images", 4), createReview);

module.exports = router;
