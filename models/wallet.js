const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Refund", "Debit", "Credit"],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order"
  },
  description: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0
  },
  transactions: [walletTransactionSchema]
});

module.exports =
  mongoose.models.Wallet || mongoose.model("Wallet", walletSchema);