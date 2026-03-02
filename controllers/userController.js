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