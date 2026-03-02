const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },

    // 🔐 Admin control
    isBlocked: {
      type: Boolean,
      default: false
    },

    // 📧 Account verification
    isVerified: {
      type: Boolean,
      default: false
    },

    // 🔢 OTP for email verification
    otp: String,
    otpExpires: Date,

    // 🔁 Password reset OTP
    resetOtp: String,
    resetOtpExpires: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);