const express = require("express");
const router = express.Router();

const {
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  logoutUser,
  forgotPassword,
  resendForgotOtp,
  resetPassword,
  googleLogin,
  getMe,
  refreshAccessToken
} = require("../controllers/authController");

const authMiddleware = require("../middlewares/authMiddleware");

router.post("/register", registerUser);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", loginUser);
router.post("/google", googleLogin);
router.post("/logout", logoutUser);
router.post("/forgot-password", forgotPassword);
router.post("/resend-forgot-otp", resendForgotOtp);
router.post("/reset-password", resetPassword);
router.post("/refresh", refreshAccessToken);
router.get("/me", authMiddleware, getMe);


module.exports = router;
