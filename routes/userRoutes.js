const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const {
  getAllUsers,
  toggleUserBlock
} = require("../controllers/userController");

// ==========================
// ADMIN ROUTES
// ==========================

// Get all users with order stats
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  getAllUsers
);

// Block / Unblock user
router.patch(
  "/:id/block",
  authMiddleware,
  adminMiddleware,
  toggleUserBlock
);

module.exports = router;