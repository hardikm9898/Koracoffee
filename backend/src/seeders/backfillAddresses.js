require("dotenv").config();

const connectDB = require("../config/db");
const User = require("../models/User");
const Address = require("../models/Address");

// One-time migration: moves any remaining embedded User.addresses[] into
// the canonical Address collection, then removes the embedded field from
// every user document. Safe to run multiple times (idempotent — skips
// users who already have Address documents, and $unset on a field that's
// already gone is a no-op). Run this BEFORE removing the `addresses` field
// from models/User.js, or the data it's meant to migrate will already be
// unreachable through the schema.
const backfillAddresses = async () => {
  try {
    await connectDB();

    const usersWithEmbedded = await User.find({ "addresses.0": { $exists: true } }).lean();
    console.log(`Found ${usersWithEmbedded.length} user(s) with non-empty embedded addresses`);

    let migrated = 0;
    for (const user of usersWithEmbedded) {
      const existingCount = await Address.countDocuments({ user: user._id });
      if (existingCount > 0) {
        continue;
      }

      const payload = user.addresses.map((address) => ({
        user: user._id,
        label: address.label || "Home",
        name: address.name,
        phone: address.phone,
        address: address.address,
        apartment: address.apartment || "",
        company: address.company || "",
        city: address.city,
        state: address.state,
        country: address.country,
        zip: address.zip,
        isDefault: Boolean(address.isDefault),
      }));

      if (payload.length > 0 && !payload.some((a) => a.isDefault)) {
        payload[0].isDefault = true;
      }

      if (payload.length > 0) {
        await Address.insertMany(payload);
        migrated += payload.length;
      }
    }

    const unsetResult = await User.updateMany({}, { $unset: { addresses: "" } });

    console.log(`Migrated ${migrated} address(es) into the Address collection`);
    console.log(`Removed the embedded addresses field from ${unsetResult.modifiedCount} user document(s)`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to backfill addresses", error);
    process.exit(1);
  }
};

backfillAddresses();
