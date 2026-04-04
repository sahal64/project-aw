const express = require("express");

const {
  placeOrder,
  getMyOrders,
  getSingleOrder,
  getAllOrders,
  updateOrderStatus,
  getOrderById,
  cancelOrder,
  requestReturn,
  approveReturn,
  rejectReturn
} = require("../controllers/orderController");

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

// USER ROUTES
router.post("/", authMiddleware, placeOrder);
router.get("/my-orders", authMiddleware, getMyOrders);

router.put("/cancel/:id", authMiddleware, cancelOrder);
router.put("/cancel-item/:orderId/:itemId", authMiddleware, (req, res, next) => {
  const { cancelOrderItem } = require("../controllers/orderController");
  return cancelOrderItem(req, res, next);
});

router.put("/:id/return", authMiddleware, requestReturn);

// ADMIN ROUTES
router.get("/admin/all", authMiddleware, adminMiddleware, (req, res, next) => {
  console.log("ADMIN ORDERS HIT");
  return getAllOrders(req, res, next);
});

router.get("/:id", authMiddleware, (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return getOrderById(req, res, next);
  }
  return getSingleOrder(req, res, next);
}); // Dynamic last

module.exports = router;