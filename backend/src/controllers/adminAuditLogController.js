const asyncHandler = require("../utils/asyncHandler");
const AuditLog = require("../models/AuditLog");

const serializeEntry = (entry) => ({
  id: String(entry._id),
  adminPhone: entry.adminPhone,
  method: entry.method,
  path: entry.path,
  statusCode: entry.statusCode,
  success: entry.success,
  createdAt: entry.createdAt,
});

const listAuditLog = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.adminPhone) {
    filter.adminPhone = String(req.query.adminPhone).trim();
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: items.map(serializeEntry),
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

module.exports = { listAuditLog };
