const jwt = require("jsonwebtoken");

const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { isAdminPhoneNumber } = require("../utils/adminAuth");

const parseCookies = (cookieHeader = "") =>
  String(cookieHeader)
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((accumulator, item) => {
      const separatorIndex = item.indexOf("=");
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = item.slice(0, separatorIndex).trim();
      const value = item.slice(separatorIndex + 1).trim();
      accumulator[key] = decodeURIComponent(value);
      return accumulator;
    }, {});

const getRequestToken = (req) => {
  const authHeader = req.headers.authorization || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  }

  const cookies = parseCookies(req.headers.cookie || "");
  return cookies.admin_token || cookies.auth_token || "";
};

const protect = asyncHandler(async (req, _res, next) => {
  const token = getRequestToken(req);

  if (!token) {
    throw new ApiError(401, "Authorization token is required");
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  const user = await User.findById(decoded.userId);

  if (!user) {
    throw new ApiError(401, "User not found for this token");
  }

  req.auth = decoded;
  req.userIsAdmin = decoded.isAdmin === true || isAdminPhoneNumber(user.phoneNumber);
  req.user = user;
  next();
});

const requireAdmin = (req, _res, next) => {
  if (!req.user || !req.userIsAdmin) {
    throw new ApiError(403, "Admin access is required");
  }

  next();
};

module.exports = {
  protect,
  requireAdmin,
};
