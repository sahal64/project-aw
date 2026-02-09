const Payment = require("../models/Payment");
const Order = require("../models/Order");

// USER – Make Payment
exports.makePayment = async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;

    const payment = await Payment.create({
      order: orderId,
      paymentMethod,
      paymentStatus: "Success", // simulated payment
      transactionId: "TXN" + Date.now(),
    });

    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: "Paid",
    });

    res.status(201).json({
      message: "Payment successful",
      payment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADMIN – Get All Payments
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find().populate("order");
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
