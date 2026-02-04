const express = require("express");
const {
  placeOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

// USER
router.post("/", authMiddleware, placeOrder);
router.get("/my-orders", authMiddleware, getMyOrders);

// ADMIN
router.get("/", authMiddleware, adminMiddleware, getAllOrders);
router.put("/:id", authMiddleware, adminMiddleware, updateOrderStatus);

module.exports = router;
