const express = require("express");
const { handleShiprocketWebhook } = require("../controllers/webhookController");

const router = express.Router();

// Public — Shiprocket calls this directly, no user session exists. Verified
// via the X-Api-Key header against SHIPROCKET_WEBHOOK_SECRET instead (see
// webhookController.js).
router.post("/shiprocket", handleShiprocketWebhook);

module.exports = router;
