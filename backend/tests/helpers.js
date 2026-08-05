const request = require("supertest");
const app = require("../src/app");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");

const uniquePhone = () => `9${Math.floor(100000000 + Math.random() * 800000000)}`;

// Drives the real OTP endpoints rather than inserting a User directly, so
// these tests exercise the actual login flow (including OTP validation)
// the same way a real client would.
async function registerAndLoginUser(name = "Test User") {
  const phoneNumber = uniquePhone();
  const otpRes = await request(app).post("/api/auth/request-otp").send({ name, phoneNumber });
  const otp = otpRes.body.data.otp; // echoed because NODE_ENV=test !== "production"
  const verifyRes = await request(app).post("/api/auth/verify-otp").send({ phoneNumber, otp });
  return { token: verifyRes.body.data.token, user: verifyRes.body.data.user, phoneNumber };
}

async function loginAdmin() {
  const phoneNumber = process.env.ADMIN_PHONE_NUMBERS.split(",")[0].trim();
  const otpRes = await request(app).post("/api/auth/admin/request-otp").send({ phoneNumber });
  const otp = otpRes.body.data.otp;
  const verifyRes = await request(app).post("/api/auth/admin/verify-otp").send({ phoneNumber, otp });
  return {
    token: verifyRes.body.data.token,
    cookie: verifyRes.headers["set-cookie"],
    phoneNumber,
  };
}

async function createTestCategory(name) {
  return Category.create({ name: name || `Category-${Date.now()}-${Math.random()}` });
}

async function createTestProduct(overrides = {}) {
  const category = overrides.category || (await createTestCategory());
  const latest = await Product.findOne().sort({ productId: -1 }).select("productId").lean();
  const productId = overrides.productId || (latest ? latest.productId + 1 : 1);

  return Product.create({
    productId,
    name: overrides.name || "Test Product",
    category: category._id,
    basePrice: overrides.basePrice ?? 20,
    notes: "test notes",
    description: "test description",
    origin: "test origin",
    variants: overrides.variants || [],
  });
}

module.exports = {
  app,
  request,
  registerAndLoginUser,
  loginAdmin,
  createTestCategory,
  createTestProduct,
};
