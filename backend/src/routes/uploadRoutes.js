const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { uploadProductImage } = require("../controllers/uploadController");

const uploadDir = path.join(__dirname, "../public/uploads/products");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDir);
  },
  filename: (req, file, callback) => {
    const timestamp = Date.now();
    const safeName = file.originalname
      .toLowerCase()
      .replace(/[^a-z0-9\.\-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    callback(null, `${timestamp}-${safeName}`);
  },
});

const imageFilter = (req, file, callback) => {
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

  if (!allowedTypes.includes(file.mimetype)) {
    return callback(new Error("Only PNG, JPEG, and WEBP images are supported."), false);
  }

  callback(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const router = express.Router();
router.post("/", upload.array("images", 10), uploadProductImage);

module.exports = router;
