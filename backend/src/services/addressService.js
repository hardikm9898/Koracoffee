const Address = require("../models/Address");

const serializeAddress = (address) => ({
  id: String(address._id),
  label: address.label,
  name: address.name,
  phone: address.phone,
  address: address.address,
  apartment: address.apartment || "",
  company: address.company || "",
  city: address.city,
  state: address.state,
  country: address.country,
  zip: address.zip,
  isDefault: Boolean(address.isDefault),
});

// Address is the single source of truth for addresses. This used to also
// lazily migrate a legacy embedded User.addresses[] field on first read;
// that field was backfilled and removed from the schema on 2026-08-05 (see
// seeders/backfillAddresses.js), so there's nothing left to migrate from.
const getUserAddresses = async (user) => {
  if (!user) {
    return [];
  }

  return Address.find({ user: user._id }).sort({ isDefault: -1, createdAt: -1 });
};

module.exports = {
  serializeAddress,
  getUserAddresses,
};
