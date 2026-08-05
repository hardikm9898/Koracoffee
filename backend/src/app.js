const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const cartRoutes = require("./routes/cartRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const adminAnalyticsRoutes = require("./routes/adminAnalyticsRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminReviewRoutes = require("./routes/adminReviewRoutes");
const adminProductRoutes = require("./routes/adminProductRoutes");
const adminCategoryRoutes = require("./routes/adminCategoryRoutes");
const adminOrderRoutes = require("./routes/adminOrderRoutes");
const adminUploadRoutes = require("./routes/adminUploadRoutes");
const adminCategoryUploadRoutes = require("./routes/adminCategoryUploadRoutes");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
const allowedOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.CLIENT_URLS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products/upload-image", uploadRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin/reviews", adminReviewRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/products/upload-image", adminUploadRoutes);
app.use("/api/admin/categories/upload-image", adminCategoryUploadRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
