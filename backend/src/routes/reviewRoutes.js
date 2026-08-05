const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { createReview, listApprovedReviews } = require("../controllers/reviewController");
const ApiError = require("../utils/ApiError");

const uploadDir = path.join(__dirname, "../public/uploads/reviews");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const timestamp = Date.now();
    const safeName = file.originalname
      .toLowerCase()
      .replace(/[^a-z0-9\.\-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    callback(null, `${timestamp}-${safeName}`);
  },
});

const imageFilter = (_req, file, callback) => {
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.mimetype)) {
    return callback(new ApiError(400, "Only PNG, JPEG, and WEBP images are supported."), false);
  }
  callback(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const router = express.Router();

router.get("/", listApprovedReviews);
router.post("/", upload.array("images", 4), createReview);

module.exports = router;
