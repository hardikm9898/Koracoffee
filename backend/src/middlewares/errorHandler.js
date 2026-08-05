const logger = require("../utils/logger");

module.exports = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;

  // Operational errors (ApiError, statusCode < 500) are expected/handled
  // request failures — log at warn. Anything else is a real bug — log at
  // error, with the full stack, so a production 500 actually leaves a trace
  // instead of vanishing after morgan's one-line request log.
  const log = statusCode >= 500 ? logger.error : logger.warn;
  log.call(logger, {
    err,
    statusCode,
    method: req.method,
    path: req.originalUrl,
  }, err.message || "Request error");

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
  });
};
