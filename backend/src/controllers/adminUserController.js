const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const User = require("../models/User");
const Address = require("../models/Address");
const Order = require("../models/Order");

const sanitizeUser = (user, addressesCount = 0) => ({
  id: user._id,
  name: user.name,
  phoneNumber: user.phoneNumber,
  isVerified: user.isVerified,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  addressesCount,
});

const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  const search = req.query.search ? String(req.query.search).trim() : "";

  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { phoneNumber: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(filter)
    .select("-otpCode -otpExpiresAt")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await User.countDocuments(filter);

  const userIds = users.map((user) => user._id);
  const addressCounts = userIds.length > 0
    ? await Address.aggregate([
        { $match: { user: { $in: userIds } } },
        { $group: { _id: "$user", count: { $sum: 1 } } },
      ])
    : [];
  const addressCountMap = new Map(
    addressCounts.map((entry) => [String(entry._id), entry.count]),
  );

  res.status(200).json({
    success: true,
    data: {
      items: users.map((user) => sanitizeUser(user, addressCountMap.get(String(user._id)) || 0)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        hasNextPage: page * limit < total,
      },
    },
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select("-otpCode -otpExpiresAt");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const addressesCount = await Address.countDocuments({ user: user._id });

  res.status(200).json({
    success: true,
    data: sanitizeUser(user, addressesCount),
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { name, phoneNumber, isVerified } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
  if (isVerified !== undefined) updateData.isVerified = isVerified;

  const user = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  }).select("-otpCode -otpExpiresAt");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const addressesCount = await Address.countDocuments({ user: user._id });

  res.status(200).json({
    success: true,
    data: sanitizeUser(user, addressesCount),
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

const summarizeOrderCadence = (sortedOrders) => {
  if (!Array.isArray(sortedOrders) || sortedOrders.length < 2) {
    return { avgDaysBetweenOrders: null, lastOrderAt: sortedOrders[0]?.createdAt || null };
  }

  const times = sortedOrders.map((o) => new Date(o.createdAt).getTime()).filter((t) => Number.isFinite(t));
  if (times.length < 2) {
    return { avgDaysBetweenOrders: null, lastOrderAt: sortedOrders[0]?.createdAt || null };
  }

  // sortedOrders is expected newest -> oldest; compute gaps between adjacent orders.
  const diffs = [];
  for (let i = 0; i < times.length - 1; i++) {
    const diffMs = Math.abs(times[i] - times[i + 1]);
    diffs.push(diffMs);
  }

  const avgMs = diffs.reduce((sum, v) => sum + v, 0) / diffs.length;
  const avgDays = Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10;
  return { avgDaysBetweenOrders: avgDays, lastOrderAt: sortedOrders[0]?.createdAt || null };
};

const getUserOrderHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);

  const user = await User.findById(userId).select("-otpCode -otpExpiresAt").lean();
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Orders are linked by shipping phone in this codebase.
  const phoneNumber = String(user.phoneNumber || "").trim();
  if (!phoneNumber) {
    return res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(user, 0),
        summary: {
          totalOrders: 0,
          totalSpend: 0,
          avgOrderValue: 0,
          avgDaysBetweenOrders: null,
          lastOrderAt: null,
        },
        orders: [],
      },
    });
  }

  const orders = await Order.find({ "shipping.phone": phoneNumber })
    .select("orderId orderCode status items shipping subtotal shippingFee tax total eta notes paymentMethod cancelReason refundReason createdAt updatedAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const totalOrders = orders.length;
  const totalSpend = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const avgOrderValue = totalOrders > 0 ? Math.round((totalSpend / totalOrders) * 100) / 100 : 0;
  const cadence = summarizeOrderCadence(orders);

  res.status(200).json({
    success: true,
    data: {
      user: sanitizeUser(user, 0),
      summary: {
        totalOrders,
        totalSpend: Math.round(totalSpend * 100) / 100,
        avgOrderValue,
        avgDaysBetweenOrders: cadence.avgDaysBetweenOrders,
        lastOrderAt: cadence.lastOrderAt,
      },
      orders: orders.map((order) => ({
        id: order.orderId,
        orderCode: order.orderCode,
        status: order.status,
        items: order.items,
        shipping: order.shipping,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        tax: order.tax,
        total: order.total,
        eta: order.eta,
        notes: order.notes,
        paymentMethod: order.paymentMethod,
        cancelReason: order.cancelReason,
        refundReason: order.refundReason,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
    },
  });
});

module.exports = {
  getAllUsers,
  getUserById,
  getUserOrderHistory,
  updateUser,
  deleteUser,
};
