const isProduction = () => process.env.NODE_ENV === "production";

/**
 * Delivers an OTP to a phone number. No real SMS/WhatsApp provider is wired
 * up here yet — plug one in (Twilio, MSG91, etc.) behind an env var before
 * this app is used with real users.
 *
 * In non-production, the OTP is logged server-side so local/staging testing
 * works without a real provider — it is intentionally NOT returned to the
 * client from here; authController still separately echoes it in the API
 * response when NODE_ENV !== "production", as a dev convenience.
 */
const sendOtp = async (phoneNumber, otp) => {
  if (!isProduction()) {
    console.log(`[otp:dev] OTP for ${phoneNumber}: ${otp}`);
    return { delivered: false, channel: "console" };
  }

  // TODO: integrate a real SMS/WhatsApp provider before enabling
  // NODE_ENV=production. Failing loudly here is intentional — silently
  // pretending delivery succeeded would leave users unable to log in with
  // no indication why.
  throw new Error(
    "No OTP delivery provider is configured for production. Configure one in backend/src/services/otpSender.js.",
  );
};

module.exports = { sendOtp };
