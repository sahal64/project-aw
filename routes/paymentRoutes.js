const express = require("express");
const {
  makePayment,
  getAllPayments,
} = require("../controllers/paymentController");

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

// USER
router.post("/", authMiddleware, makePayment);

// ADMIN
router.get("/", authMiddleware, adminMiddleware, getAllPayments);

module.exports = router;
