const crypto = require("crypto");

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

// Admin OTP must be generated exactly like regular-user OTP. This used to
// return a hardcoded "111111" for every admin login — effectively a fixed
// password for the highest-privilege accounts in the system. Never
// reintroduce a fixed/predictable value here.
const generateAdminOtp = generateOtp;

const getOtpExpiryDate = () => {
  const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);
  return new Date(Date.now() + expiryMinutes * 60 * 1000);
};

module.exports = {
  generateOtp,
  generateAdminOtp,
  getOtpExpiryDate,
};
