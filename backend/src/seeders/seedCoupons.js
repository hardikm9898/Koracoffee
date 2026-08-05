require("dotenv").config();

const connectDB = require("../config/db");
const Coupon = require("../models/Coupon");

// Upserts (never wipes) — safe to run against a real database. Seeds the
// three codes that used to be hardcoded in orderController.js /
// checkout/page.tsx / profile/page.tsx before the real Coupon model
// existed, so removing those hardcoded fallbacks doesn't remove the
// codes themselves.
const DEFAULT_COUPONS = [
  { code: "AURA20", type: "percent", value: 20, label: "20% off your order" },
  { code: "FREESHIP", type: "shipping", value: 0, label: "Free shipping" },
  { code: "WELCOME50", type: "flat", value: 50, label: "₹50 off your order" },
];

const seedCoupons = async () => {
  try {
    await connectDB();

    for (const coupon of DEFAULT_COUPONS) {
      await Coupon.findOneAndUpdate(
        { code: coupon.code },
        { $setOnInsert: coupon },
        { upsert: true, new: true },
      );
    }

    console.log(`Seeded ${DEFAULT_COUPONS.length} default coupons (upsert, existing coupons untouched)`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed coupons", error);
    process.exit(1);
  }
};

seedCoupons();
