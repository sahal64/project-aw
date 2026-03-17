const express = require("express");
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getRazorpayKey,
  getAllPayments,
} = require("../controllers/paymentController");

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

// USER
router.post("/create-order", authMiddleware, createRazorpayOrder);
router.post("/verify-payment", authMiddleware, verifyRazorpayPayment);
router.get("/get-razorpay-key", authMiddleware, getRazorpayKey);

// ADMIN
router.get("/", authMiddleware, adminMiddleware, getAllPayments);

module.exports = router;
