const express = require("express");
const router = express.Router();
const couponController = require("../controllers/couponController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// User Route
router.get("/active", authMiddleware, couponController.getActiveCoupons);
router.post("/validate", authMiddleware, couponController.validateCoupon);
router.post("/apply", authMiddleware, couponController.applyCoupon);

// User Route
router.get("/active", authMiddleware, couponController.getActiveCoupons);
router.post("/validate", authMiddleware, couponController.validateCoupon);
router.post("/apply", authMiddleware, couponController.applyCoupon);

module.exports = router;
