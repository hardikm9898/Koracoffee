const ApiError = require("../utils/ApiError");

const uploadProductImage = (req, res) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    throw new ApiError(400, "At least one image file is required");
  }

  const urls = req.files.map((file) => {
    const fileName = file.filename;
    return `${req.protocol}://${req.get("host")}/uploads/products/${fileName}`;
  });

  res.status(201).json({
    success: true,
    data: {
      urls,
    },
  });
};

const uploadCategoryImage = (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Category image file is required");
  }

  const url = `${req.protocol}://${req.get("host")}/uploads/categories/${req.file.filename}`;

  res.status(201).json({
    success: true,
    data: {
      url,
    },
  });
};

module.exports = {
  uploadProductImage,
  uploadCategoryImage,
};
