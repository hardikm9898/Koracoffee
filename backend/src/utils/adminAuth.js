const normalizePhoneNumber = (phoneNumber = "") => String(phoneNumber).replace(/\D/g, "");

const getAdminPhoneNumbers = () =>
  String(process.env.ADMIN_PHONE_NUMBERS || "")
    .split(",")
    .map((value) => normalizePhoneNumber(value))
    .filter(Boolean);

const isAdminPhoneNumber = (phoneNumber = "") =>
  getAdminPhoneNumbers().includes(normalizePhoneNumber(phoneNumber));

module.exports = {
  normalizePhoneNumber,
  getAdminPhoneNumbers,
  isAdminPhoneNumber,
};
