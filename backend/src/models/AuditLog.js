const mongoose = require("mongoose");

// Records every mutating admin action (see middlewares/auditLog.js). There
// is deliberately no "action type" taxonomy or granular permission model
// here — this only answers "who did what, when," not "were they allowed
// to." All admins are currently equal (a single ADMIN_PHONE_NUMBERS
// allowlist); a real roles/permissions system is a product decision, not
// implemented here — see project-context/blocked-external-resources.md.
const auditLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    adminPhone: {
      type: String,
      default: "",
    },
    method: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    success: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
