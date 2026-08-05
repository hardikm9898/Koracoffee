const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ApiError = require("./ApiError");

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const sanitizeFilename = (originalname) =>
  String(originalname || "")
    .toLowerCase()
    .replace(/[^a-z0-9.\-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const imageFileFilter = (_req, file, callback) => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    // ApiError so errorHandler responds 400. This used to be inconsistent:
    // reviewRoutes.js already threw ApiError here, but the other 3 upload
    // routes threw a plain Error, which has no statusCode, so errorHandler
    // defaulted it to 500 for a client mistake (wrong file type) that
    // should always have been a 400. Standardized on ApiError everywhere.
    return callback(new ApiError(400, "Only PNG, JPEG, and WEBP images are supported."), false);
  }
  callback(null, true);
};

// Builds a multer instance that saves into backend/src/public/uploads/<subdir>,
// creating the directory if it doesn't exist. Used by every disk-based
// upload route (product images, category images, review images) — this
// storage/fileFilter/limits/filename-sanitizer setup used to be copy-pasted
// near-verbatim across 4 separate route files.
const createImageUploader = (subdir) => {
  const uploadDir = path.join(__dirname, "../public/uploads", subdir);
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => {
      callback(null, `${Date.now()}-${sanitizeFilename(file.originalname)}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    fileFilter: imageFileFilter,
  });
};

module.exports = { createImageUploader, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES };
