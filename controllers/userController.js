const User = require("../models/User");
const Order = require("../models/Order");

// ==========================
// ADMIN – Get All Users
// ==========================
exports.getAllUsers = async (req, res, next) => {
  try {

    const users = await User.find({ role: "user" }).select("-password");

    const usersWithStats = await Promise.all(
      users.map(async (user) => {

        const orders = await Order.find({ user: user._id });

        const totalOrders = orders.length;

        const totalSpent = orders.reduce(
          (sum, order) => sum + order.totalAmount,
          0
        );

        return {
          ...user.toObject(),
          totalOrders,
          totalSpent
        };
      })
    );

    res.json({
      success: true,
      users: usersWithStats
    });

  } catch (error) {
    next(error);
  }
};

// ==========================
// ADMIN – Block / Unblock User
// ==========================
exports.toggleUserBlock = async (req, res, next) => {
  try {

    const user = await User.findById(req.params.id);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    user.isBlocked = !user.isBlocked;

    await user.save();

    res.json({
      success: true,
      message: `User ${user.isBlocked ? "blocked" : "unblocked"} successfully`
    });

  } catch (error) {
    next(error);
  }
};

// ==========================
// USER – Wishlist
// ==========================

// Get user's wishlist
exports.getWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('wishlist');

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({
      success: true,
      wishlist: user.wishlist
    });
  } catch (error) {
    next(error);
  }
};

// Add product to wishlist
exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if product is already in wishlist
    if (user.wishlist.includes(productId)) {
      return res.status(400).json({ success: false, message: "Product already in wishlist" });
    }

    user.wishlist.push(productId);
    await user.save();

    res.json({
      success: true,
      message: "Product added to wishlist"
    });
  } catch (error) {
    next(error);
  }
};

// Remove product from wishlist
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Remove item from array
    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();

    res.json({
      success: true,
      message: "Product removed from wishlist"
    });
  } catch (error) {
    next(error);
  }
};