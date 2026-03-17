const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const {
  getAllUsers,
  toggleUserBlock,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getAddresses,
  addAddress,
  deleteAddress,
  setDefaultAddress,
  updateProfile
} = require("../controllers/userController");

// ==========================
// USER ROUTES (Wishlist & Profile)
// ==========================

// Get user's wishlist
router.get(
  "/wishlist",
  authMiddleware,
  getWishlist
);

// Update profile details
router.put(
  "/profile",
  authMiddleware,
  updateProfile
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
// USER ROUTES (Address Book)
// ==========================

// Get user's addresses
router.get(
  "/addresses",
  authMiddleware,
  getAddresses
);

// Add an address
router.post(
  "/addresses",
  authMiddleware,
  addAddress
);

// Delete an address
router.delete(
  "/addresses/:id",
  authMiddleware,
  deleteAddress
);

// Set default address
router.put(
  "/addresses/:id/default",
  authMiddleware,
  setDefaultAddress
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