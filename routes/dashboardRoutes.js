const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const { getDashboardStats, getRevenueChart } = require("../controllers/dashboardController");

router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  getDashboardStats
);

router.get(
  "/revenue-chart",
  authMiddleware,
  adminMiddleware,
  getRevenueChart
);

module.exports = router;