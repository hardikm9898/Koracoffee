const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otpCode: {
      type: String,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Addresses used to also be embedded directly on User (a legacy duplicate
// of the standalone Address collection below). Removed 2026-08-05 after
// backfilling any remaining embedded data into Address — see
// seeders/backfillAddresses.js and services/addressService.js. Address is
// now the only place addresses live; do not reintroduce an embedded field
// here.
module.exports = mongoose.model("User", userSchema);
