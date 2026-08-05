const express = require("express");

const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const { uploadProductImage } = require("../controllers/uploadController");
const { createImageUploader } = require("../utils/imageUpload");

const upload = createImageUploader("products");

const router = express.Router();

router.use(protect, requireAdmin);
router.post("/", upload.array("images", 10), uploadProductImage);

module.exports = router;
