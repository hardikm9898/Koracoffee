const express = require("express");
const { protect, requireAdmin } = require("../middlewares/authMiddleware");
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserOrderHistory,
} = require("../controllers/adminUserController");

const router = express.Router();

// All admin routes require authentication
router.use(protect, requireAdmin);

router.get("/", getAllUsers);
router.get("/:userId", getUserById);
router.get("/:userId/orders", getUserOrderHistory);
router.patch("/:userId", updateUser);
router.delete("/:userId", deleteUser);

module.exports = router;
