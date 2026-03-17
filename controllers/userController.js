const User = require("../models/User");
const Order = require("../models/Order");
const bcrypt = require("bcryptjs");

// ==========================
// ADMIN – Get All Users
// ==========================
exports.getAllUsers = async (req, res, next) => {
  try {
    let { search, status, page = 1, limit = 10 } = req.query;

    // 1. Sanitize & Validate
    page = Math.max(1, parseInt(page));
    limit = Math.max(1, parseInt(limit));
    if (search) search = search.trim().substring(0, 50);

    // 2. Build Query
    const query = { role: "user" };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
      ];
    }

    if (status && status !== "all") {
      if (status === "active") {
        query.isBlocked = false;
        query.isVerified = true;
      } else if (status === "blocked") {
        query.isBlocked = true;
      } else if (status === "unverified") {
        query.isVerified = false;
      }
    }

    // 3. Execution (Pagination)
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);
    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // 4. Aggregate Stats (for the paginated slice)
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const orders = await Order.find({ user: user._id });
        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);

        return {
          ...user.toObject(),
          totalOrders,
          totalSpent
        };
      })
    );

    res.json({
      success: true,
      users: usersWithStats,
      totalUsers,
      totalPages,
      currentPage: page
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
// ADMIN – Get Customer Details
// ==========================
exports.getCustomerDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const orderCount = await Order.countDocuments({ user: user._id });
    const Wallet = require("../models/wallet");
    const wallet = await Wallet.findOne({ user: user._id });

    // Status Logic
    let status = "Active";
    if (user.isBlocked) {
      status = "Blocked";
    } else if (!user.isVerified) {
      status = "Unverified";
    }

    res.json({
      success: true,
      customer: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "N/A",
        createdAt: user.createdAt,
        walletBalance: wallet ? wallet.balance : 0,
        orderCount,
        status
      }
    });

  } catch (error) {
    next(error);
  }
};

// ==========================
// ADMIN – Delete Customer
// ==========================
exports.deleteCustomer = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ success: false, message: "Cannot delete an admin account" });
    }

    // Check for existing orders
    const orderExists = await Order.findOne({ user: user._id });
    if (orderExists) {
      return res.status(400).json({ success: false, message: "Cannot delete customer with existing orders" });
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: "Customer deleted successfully"
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

// ==========================
// USER – Address Book
// ==========================

// Get user's addresses
exports.getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, addresses: user.addresses || [] });
  } catch (error) {
    next(error);
  }
};

// Add a new address
exports.addAddress = async (req, res, next) => {
  try {
    const { firstName, lastName, street, city, state, zip, phone } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Validate required fields
    if (!firstName || !lastName || !street || !city || !state || !zip || !phone) {
      return res.status(400).json({ success: false, message: "All address fields are required" });
    }

    const newAddress = { firstName, lastName, street, city, state, zip, phone };

    // If it's the first address, make it default
    if (!user.addresses || user.addresses.length === 0) {
      newAddress.isDefault = true;
    }

    user.addresses.push(newAddress);
    await user.save();

    res.json({ success: true, message: "Address added successfully", addresses: user.addresses });
  } catch (error) {
    next(error);
  }
};

// Delete an address
exports.deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.addresses = user.addresses.filter(addr => addr._id.toString() !== id);

    // If the default address was deleted, make the first available one default (if any exist)
    if (user.addresses.length > 0 && !user.addresses.some(addr => addr.isDefault)) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.json({ success: true, message: "Address deleted", addresses: user.addresses });
  } catch (error) {
    next(error);
  }
};

// Set default address
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.addresses.forEach(addr => {
      addr.isDefault = addr._id.toString() === id;
    });

    await user.save();

    res.json({ success: true, message: "Default address updated", addresses: user.addresses });
  } catch (error) {
    next(error);
  }
};

// ==========================
// USER – Profile
// ==========================
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Name validation
    if (firstName && firstName.trim().length < 2) {
      return res.status(400).json({ success: false, message: "First name must be at least 2 characters" });
    }

    if (lastName && lastName.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Last name must be at least 2 characters" });
    }

    if (firstName) {
      const updatedName = lastName ? `${firstName.trim()} ${lastName.trim()}` : firstName.trim();
      user.name = updatedName;
    }

    // Password change
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: "Current password is required" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Incorrect current password" });
      }

      // Strong password validation
      const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
      if (!strongPassword.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and symbols"
        });
      }

      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    next(error);
  }
};