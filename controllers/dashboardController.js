const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");

// ==========================
// ADMIN – Dashboard Stats
// ==========================
exports.getDashboardStats = async (req, res, next) => {
  try {

    const totalUsers = await User.countDocuments({ role: "user" });

    const totalOrders = await Order.countDocuments();

    const revenueData = await Order.aggregate([
      {
        $match: { paymentStatus: "Paid" }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" }
        }
      }
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    const lowStockProducts = await Product.countDocuments({
      stock: { $lte: 5 },
      isActive: true
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalOrders,
        totalRevenue,
        lowStockProducts
      }
    });

  } catch (error) {
    next(error);
  }
};

// ==========================
// ADMIN – Monthly Revenue Chart
// ==========================
exports.getRevenueChart = async (req, res, next) => {
  try {

    const revenue = await Order.aggregate([
      {
        $match: { paymentStatus: "Paid" }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Create 12 month array
    const monthlyData = Array(12).fill(0);

    revenue.forEach(r => {
      monthlyData[r._id - 1] = r.total;
    });

    res.json({
      success: true,
      data: monthlyData
    });

  } catch (error) {
    next(error);
  }
};