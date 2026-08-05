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

const migrateEmbeddedAddresses = async (user) => {
  if (!user || !Array.isArray(user.addresses) || user.addresses.length === 0) {
    return [];
  }

  const existingCount = await Address.countDocuments({ user: user._id });
  if (existingCount > 0) {
    return Address.find({ user: user._id }).sort({ isDefault: -1, createdAt: -1 });
  }

  const payload = user.addresses.map((address) => ({
    user: user._id,
    label: address.label || "Home",
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
  }));

  if (payload.length > 0 && !payload.some((address) => address.isDefault)) {
    payload[0].isDefault = true;
  }

  if (payload.length > 0) {
    await Address.insertMany(payload);
  }

  return Address.find({ user: user._id }).sort({ isDefault: -1, createdAt: -1 });
};

const getUserAddresses = async (user) => {
  if (!user) {
    return [];
  }

  const addresses = await Address.find({ user: user._id }).sort({ isDefault: -1, createdAt: -1 });

  if (addresses.length > 0) {
    return addresses;
  }

  return migrateEmbeddedAddresses(user);
};

module.exports = {
  serializeAddress,
  getUserAddresses,
};
