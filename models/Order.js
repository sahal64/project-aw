const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        itemStatus: {
          type: String,
          enum: ["Placed", "Processing", "Delivered", "Cancelled"],
          default: "Placed",
        },
      },
    ],

    orderNumber: {
      type: String,
      unique: true
    },


    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refund Pending", "Refunded"],
      default: "Pending",
    },

    orderStatus: {
      type: String,
      enum: ["Placed", "Processing", "Delivered", "Cancelled"],
      default: "Placed",
    },

    address: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
      phone: { type: String, required: true }
    },

    // 🧾 Optional future expansion
    paymentMethod: {
      type: String,
      enum: ["COD", "Razorpay", "Stripe", "Wallet"],
      default: "COD",
    },

    isRefunded: {
      type: Boolean,
      default: false,
    },

    razorpay_order_id: {
      type: String,
    },

    razorpay_payment_id: {
      type: String,
    },
    couponCode: {
      type: String,
      default: null,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    returnRequest: {
      status: {
        type: String,
        enum: ["none", "requested", "approved", "rejected"],
        default: "none"
      },
      reason: String,
      requestedAt: Date
    },
    deliveredAt: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);