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
      required: function () {
        return !this.isGoogleUser;
      },
      minlength: 6
    },

    googleId: {
      type: String
    },

    isGoogleUser: {
      type: Boolean,
      default: false
    },

    profilePicture: {
      type: String
    },

    phone: {
      type: String,
      trim: true
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
    resetOtpExpires: Date,

    // ❤️ Wishlist referencing products
    wishlist: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],

    // 🏠 Saved Addresses
    addresses: [{
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
      phone: { type: String, required: true },
      isDefault: { type: Boolean, default: false }
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);