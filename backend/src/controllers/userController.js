const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const Address = require("../models/Address");
const { getUserAddresses, serializeAddress } = require("../services/addressService");

const sanitizeUser = (user, addresses = []) => ({
  id: user._id,
  name: user.name,
  phoneNumber: user.phoneNumber,
  isVerified: user.isVerified,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  addresses: addresses.map(serializeAddress),
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const addresses = await getUserAddresses(req.user);
  res.status(200).json({
    success: true,
    data: sanitizeUser(req.user, addresses),
  });
});

const validateAddressPayload = (payload = {}) => {
  const sanitized = {
    label: String(payload.label || "").trim() || "Home",
    name: String(payload.name || "").trim(),
    phone: String(payload.phone || "").trim(),
    address: String(payload.address || "").trim(),
    apartment: String(payload.apartment || "").trim(),
    company: String(payload.company || "").trim(),
    city: String(payload.city || "").trim(),
    state: String(payload.state || "").trim(),
    country: String(payload.country || "").trim(),
    zip: String(payload.zip || "").trim(),
    isDefault:
      payload.isDefault === true || String(payload.isDefault).toLowerCase() === "true",
  };

  if (!sanitized.name) {
    throw new ApiError(400, "Address name is required");
  }

  if (!/^[0-9]{10}$/.test(sanitized.phone)) {
    throw new ApiError(400, "Phone must be a 10-digit number");
  }

  if (!sanitized.address) {
    throw new ApiError(400, "Street address is required");
  }

  if (!sanitized.city) {
    throw new ApiError(400, "City is required");
  }

  if (!sanitized.state) {
    throw new ApiError(400, "State is required");
  }

  if (!sanitized.country) {
    throw new ApiError(400, "Country is required");
  }

  if (!/^[0-9]{4,10}$/.test(sanitized.zip)) {
    throw new ApiError(400, "Zip code must be valid");
  }

  return sanitized;
};

const refreshDefaultAddress = async (userId, defaultAddressId) => {
  await Address.updateMany({ user: userId }, { $set: { isDefault: false } });

  if (defaultAddressId) {
    await Address.updateOne(
      { _id: defaultAddressId, user: userId },
      { $set: { isDefault: true } },
    );
  }
};

const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await getUserAddresses(req.user);
  res.status(200).json({
    success: true,
    data: addresses.map(serializeAddress),
  });
});

const createAddress = asyncHandler(async (req, res) => {
  const user = req.user;
  const addressPayload = validateAddressPayload(req.body);
  const existingAddresses = await getUserAddresses(user);
  const shouldBeDefault = addressPayload.isDefault || existingAddresses.length === 0;

  if (shouldBeDefault) {
    await refreshDefaultAddress(user._id, null);
  }

  await Address.create({
    user: user._id,
    ...addressPayload,
    isDefault: shouldBeDefault,
  });

  const updatedAddresses = await getUserAddresses(user);

  res.status(201).json({
    success: true,
    data: updatedAddresses.map(serializeAddress),
  });
});

const updateAddress = asyncHandler(async (req, res) => {
  const addressId = String(req.params.addressId || "").trim();
  const user = req.user;

  if (!addressId) {
    throw new ApiError(400, "Address id is required");
  }

  const address = await Address.findOne({ _id: addressId, user: user._id });

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  const addressPayload = validateAddressPayload(req.body);

  address.label = addressPayload.label;
  address.name = addressPayload.name;
  address.phone = addressPayload.phone;
  address.address = addressPayload.address;
  address.apartment = addressPayload.apartment;
  address.company = addressPayload.company;
  address.city = addressPayload.city;
  address.state = addressPayload.state;
  address.country = addressPayload.country;
  address.zip = addressPayload.zip;

  if (addressPayload.isDefault) {
    await refreshDefaultAddress(user._id, addressId);
    address.isDefault = true;
  }

  await address.save();
  const updatedAddresses = await getUserAddresses(user);

  res.status(200).json({
    success: true,
    data: updatedAddresses.map(serializeAddress),
  });
});

const deleteAddress = asyncHandler(async (req, res) => {
  const addressId = String(req.params.addressId || "").trim();
  const user = req.user;

  if (!addressId) {
    throw new ApiError(400, "Address id is required");
  }

  const address = await Address.findOne({ _id: addressId, user: user._id });

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  await Address.deleteOne({ _id: addressId, user: user._id });
  const remainingAddresses = await getUserAddresses(user);

  if (remainingAddresses.length > 0 && !remainingAddresses.some((addr) => addr.isDefault)) {
    await refreshDefaultAddress(user._id, remainingAddresses[0]._id);
  }

  const updatedAddresses = await getUserAddresses(user);

  res.status(200).json({
    success: true,
    data: updatedAddresses.map(serializeAddress),
  });
});

module.exports = {
  getCurrentUser,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
};
