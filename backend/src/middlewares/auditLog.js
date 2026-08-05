const AuditLog = require("../models/AuditLog");
const logger = require("../utils/logger");

// Mounted once at /api/admin in app.js, before the individual admin
// routers — this only registers a res "finish" listener and calls next()
// immediately, so it runs correctly even though req.user isn't set yet at
// this point in the chain: by the time "finish" actually fires (after the
// downstream protect/requireAdmin middleware and the route handler have
// both run), req.user has already been populated. GET requests are
// skipped — this logs actions (writes), not browsing.
const auditLog = (req, res, next) => {
  if (req.method === "GET") {
    return next();
  }

  res.on("finish", () => {
    // Write failures here must never surface to the client or affect the
    // actual admin action that already completed — log and move on.
    AuditLog.create({
      admin: req.user?._id || null,
      adminPhone: req.user?.phoneNumber || "",
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      success: res.statusCode < 400,
    }).catch((err) => {
      logger.error({ err }, "Failed to write audit log entry");
    });
  });

  next();
};

module.exports = auditLog;
