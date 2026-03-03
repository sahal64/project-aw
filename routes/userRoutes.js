const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const {
  getAllUsers,
  toggleUserBlock,
  getWishlist,
  addToWishlist,
  removeFromWishlist
} = require("../controllers/userController");

// ==========================
// USER ROUTES (Wishlist)
// ==========================

// Get user's wishlist
router.get(
  "/wishlist",
  authMiddleware,
  getWishlist
);

// Add product to wishlist
router.post(
  "/wishlist/add",
  authMiddleware,
  addToWishlist
);

// Remove product from wishlist
router.delete(
  "/wishlist/remove/:productId",
  authMiddleware,
  removeFromWishlist
);

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