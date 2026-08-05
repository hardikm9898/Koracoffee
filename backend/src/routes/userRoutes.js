const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const {
  getCurrentUser,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} = require("../controllers/userController");

const router = express.Router();

router.get("/me", protect, getCurrentUser);
router.get("/me/addresses", protect, listAddresses);
router.post("/me/addresses", protect, createAddress);
router.patch("/me/addresses/:addressId", protect, updateAddress);
router.delete("/me/addresses/:addressId", protect, deleteAddress);

module.exports = router;
