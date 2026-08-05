const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { generateOtp, generateAdminOtp, getOtpExpiryDate } = require("../services/otpService");
const { generateToken } = require("../services/tokenService");
const {
  normalizePhoneNumber,
  isAdminPhoneNumber,
} = require("../utils/adminAuth");
const {
  getUserAddresses,
  serializeAddress,
} = require("../services/addressService");

const sanitizeUser = (user, addresses = []) => ({
  id: user._id,
  name: user.name,
  phoneNumber: user.phoneNumber,
  isVerified: user.isVerified,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  addresses: addresses.map(serializeAddress),
});

const validateNameAndPhone = (name, phoneNumber) => {
  const trimmedName = String(name || "").trim();
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  if (trimmedName.length < 2) {
    throw new ApiError(400, "Name must be at least 2 characters long");
  }

  if (normalizedPhone.length !== 10) {
    throw new ApiError(400, "Phone number must be exactly 10 digits");
  }

  return {
    trimmedName,
    normalizedPhone,
  };
};

const sanitizeAdminUser = (user) => ({
  ...sanitizeUser(user, []),
  isAdmin: isAdminPhoneNumber(user.phoneNumber),
});

const getAdminCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite =
    process.env.ADMIN_COOKIE_SAME_SITE || (isProduction ? "none" : "lax");
  const cookieOptions = {
    httpOnly: true,
    sameSite,
    secure: isProduction || sameSite === "none",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  // if (process.env.ADMIN_COOKIE_DOMAIN) {
  //   cookieOptions.domain = process.env.ADMIN_COOKIE_DOMAIN;
  // }

  return cookieOptions;
};

const requestOtp = asyncHandler(async (req, res) => {
  const { trimmedName, normalizedPhone } = validateNameAndPhone(
    req.body.name,
    req.body.phoneNumber,
  );

  const otpCode = generateOtp();
  const otpExpiresAt = getOtpExpiryDate();

  let user = await User.findOne({ phoneNumber: normalizedPhone });

  if (!user) {
    user = await User.create({
      name: trimmedName,
      phoneNumber: normalizedPhone,
      otpCode,
      otpExpiresAt,
      isVerified: false,
    });
  } else {
    user.name = trimmedName;
    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();
  }

  res.status(200).json({
    success: true,
    message: "OTP generated successfully",
    data: {
      phoneNumber: user.phoneNumber,
      expiresAt: otpExpiresAt,
      ...(process.env.NODE_ENV !== "production" ? { otp: otpCode } : {}),
    },
  });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const normalizedPhone = normalizePhoneNumber(req.body.phoneNumber);
  const otp = String(req.body.otp || "").trim();
  const incomingName = String(req.body.name || "").trim();

  if (normalizedPhone.length !== 10) {
    throw new ApiError(400, "Phone number must be exactly 10 digits");
  }

  if (!/^\d{6}$/.test(otp)) {
    throw new ApiError(400, "OTP must be a 6-digit number");
  }

  const user = await User.findOne({ phoneNumber: normalizedPhone });

  if (!user) {
    throw new ApiError(404, "User not found. Please request OTP first");
  }

  if (!user.otpCode || !user.otpExpiresAt) {
    throw new ApiError(400, "OTP not requested for this number");
  }

  if (user.otpExpiresAt.getTime() < Date.now()) {
    throw new ApiError(400, "OTP expired. Please request a new OTP");
  }

  if (user.otpCode !== otp) {
    throw new ApiError(400, "Invalid OTP");
  }

  if (incomingName.length >= 2) {
    user.name = incomingName;
  }

  user.isVerified = true;
  user.lastLoginAt = new Date();
  user.otpCode = null;
  user.otpExpiresAt = null;
  await user.save();

  const token = generateToken({
    userId: user._id.toString(),
    phoneNumber: user.phoneNumber,
  });
  const addresses = await getUserAddresses(user);

  res.status(200).json({
    success: true,
    message: "OTP verified successfully",
    data: {
      token,
      user: sanitizeUser(user, addresses),
    },
  });
});

const requestAdminOtp = asyncHandler(async (req, res) => {
  const normalizedPhone = normalizePhoneNumber(req.body.phoneNumber);
  const trimmedName = String(req.body.name || "").trim() || "Admin";

  if (normalizedPhone.length !== 10) {
    throw new ApiError(400, "Phone number must be exactly 10 digits");
  }

  if (!isAdminPhoneNumber(normalizedPhone)) {
    throw new ApiError(403, "This phone number is not allowed to access admin");
  }

  const otpCode = generateAdminOtp();
  const otpExpiresAt = getOtpExpiryDate();

  let user = await User.findOne({ phoneNumber: normalizedPhone });

  if (!user) {
    user = await User.create({
      name: trimmedName,
      phoneNumber: normalizedPhone,
      otpCode,
      otpExpiresAt,
      isVerified: false,
    });
  } else {
    if (trimmedName.length >= 2) {
      user.name = trimmedName;
    }
    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();
  }

  res.status(200).json({
    success: true,
    message: "Admin OTP generated successfully",
    data: {
      phoneNumber: user.phoneNumber,
      expiresAt: otpExpiresAt,
      ...(process.env.NODE_ENV !== "production" ? { otp: otpCode } : {}),
    },
  });
});

const verifyAdminOtp = asyncHandler(async (req, res) => {
  const normalizedPhone = normalizePhoneNumber(req.body.phoneNumber);
  const otp = String(req.body.otp || "").trim();

  if (normalizedPhone.length !== 10) {
    throw new ApiError(400, "Phone number must be exactly 10 digits");
  }

  if (!isAdminPhoneNumber(normalizedPhone)) {
    throw new ApiError(403, "This phone number is not allowed to access admin");
  }

  if (!/^\d{6}$/.test(otp)) {
    throw new ApiError(400, "OTP must be a 6-digit number");
  }

  const user = await User.findOne({ phoneNumber: normalizedPhone });

  if (!user) {
    throw new ApiError(404, "Admin user not found. Please request OTP first");
  }

  if (!user.otpCode || !user.otpExpiresAt) {
    throw new ApiError(400, "OTP not requested for this number");
  }

  if (user.otpExpiresAt.getTime() < Date.now()) {
    throw new ApiError(400, "OTP expired. Please request a new OTP");
  }

  if (user.otpCode !== otp) {
    throw new ApiError(400, "Invalid OTP");
  }

  user.isVerified = true;
  user.lastLoginAt = new Date();
  user.otpCode = null;
  user.otpExpiresAt = null;
  await user.save();

  const token = generateToken({
    userId: user._id.toString(),
    phoneNumber: user.phoneNumber,
    isAdmin: true,
  });

  res.cookie("admin_token", token, getAdminCookieOptions());
  res.status(200).json({
    success: true,
    message: "Admin OTP verified successfully",
    data: {
      token, // Return token in response body as fallback for cross-origin cookie issues
      user: sanitizeAdminUser(user),
    },
  });
});

const getCurrentAdmin = asyncHandler(async (req, res) => {
  if (!req.user || !req.userIsAdmin) {
    throw new ApiError(403, "Admin access is required");
  }

  res.status(200).json({
    success: true,
    data: sanitizeAdminUser(req.user),
  });
});

const logoutAdmin = asyncHandler(async (_req, res) => {
  res.clearCookie("admin_token", {
    ...getAdminCookieOptions(),
    maxAge: undefined,
  });

  res.status(200).json({
    success: true,
    message: "Admin logged out successfully",
  });
});

module.exports = {
  requestOtp,
  verifyOtp,
  requestAdminOtp,
  verifyAdminOtp,
  getCurrentAdmin,
  logoutAdmin,
};
