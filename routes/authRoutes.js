const express = require("express");
const router = express.Router();

const {
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  logoutUser,
  forgotPassword,
  resendForgotOtp, // 👈 ADD
  resetPassword
} = require("../controllers/authController");


router.post("/register", registerUser);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/forgot-password", forgotPassword);
router.post("/resend-forgot-otp", resendForgotOtp);
router.post("/reset-password", resetPassword);


module.exports = router;
