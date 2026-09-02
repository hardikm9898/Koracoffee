const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const { apiLimiter } = require("./middlewares/rateLimiters");

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
const couponRoutes = require("./routes/couponRoutes");
const adminCouponRoutes = require("./routes/adminCouponRoutes");
const adminAuditLogRoutes = require("./routes/adminAuditLogRoutes");
const adminInventoryRoutes = require("./routes/adminInventoryRoutes");
const adminSupplierRoutes = require("./routes/adminSupplierRoutes");
const adminPurchaseRoutes = require("./routes/adminPurchaseRoutes");
const adminRecipeRoutes = require("./routes/adminRecipeRoutes");
const adminExpenseRoutes = require("./routes/adminExpenseRoutes");
const adminReportRoutes = require("./routes/adminReportRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const auditLog = require("./middlewares/auditLog");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// Required once this app runs behind a reverse proxy (Nginx, ALB, etc.).
// Without it, two things silently break: req.protocol/req.get("host") (used
// to build absolute /uploads image URLs) always reports the proxy's local
// connection instead of the real client's scheme, and express-rate-limit's
// req.ip resolves to the proxy's own address for every request — collapsing
// every visitor into one shared rate-limit bucket instead of limiting them
// individually. `1` trusts exactly one hop (the proxy in front of this
// process), which matches this deployment; only raise it if another proxy
// is added in front of Nginx.
app.set("trust proxy", 1);

const allowedOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.CLIENT_URLS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
].filter(Boolean);

app.use(
  helmet({
    // Product/category/review images under /uploads are served by this app
    // but embedded by two separate Next.js frontends on different origins —
    // helmet's default same-origin CORP would block that cross-origin <img>
    // embedding, so it's explicitly relaxed here. crossOriginEmbedderPolicy
    // is disabled for the same reason (no COEP requirement on this API).
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);
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
app.use("/api", apiLimiter);
// Registered before the individual /api/admin/* routers below so it runs
// first in the chain for every admin request — see middlewares/auditLog.js
// for why that's safe even though req.user isn't set until those routers'
// own protect/requireAdmin middleware runs afterward.
app.use("/api/admin", auditLog);

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
app.use("/api/coupons", couponRoutes);
app.use("/api/admin/coupons", adminCouponRoutes);
app.use("/api/admin/audit-log", adminAuditLogRoutes);
app.use("/api/admin/inventory", adminInventoryRoutes);
app.use("/api/admin/suppliers", adminSupplierRoutes);
app.use("/api/admin/purchases", adminPurchaseRoutes);
app.use("/api/admin/recipes", adminRecipeRoutes);
app.use("/api/admin/expenses", adminExpenseRoutes);
app.use("/api/admin/reports", adminReportRoutes);
app.use("/api/webhooks", webhookRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
