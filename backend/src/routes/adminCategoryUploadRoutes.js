const express = require("express");

const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const { uploadCategoryImage } = require("../controllers/uploadController");
const { createImageUploader } = require("../utils/imageUpload");

const upload = createImageUploader("categories");

const router = express.Router();

router.use(protect, requireAdmin);
router.post("/", upload.single("image"), uploadCategoryImage);

module.exports = router;
