const express = require("express");
const { uploadProductImage } = require("../controllers/uploadController");
const { createImageUploader } = require("../utils/imageUpload");

const upload = createImageUploader("products");

const router = express.Router();
router.post("/", upload.array("images", 10), uploadProductImage);

module.exports = router;
