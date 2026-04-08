const Payment = require("../models/Payment");
const Order = require("../models/Order");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// ADMIN – Get All Payments
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find().populate("order");
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Razorpay Public Key
exports.getRazorpayKey = (req, res) => {
  res.status(200).json({ key: process.env.RAZORPAY_KEY_ID });
};

// ================= RAZORPAY =================

// Initialize Razorpay Instance
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// Create Razorpay Order
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount, items } = req.body;

    if (!amount) {
      return res.status(400).json({ message: "Amount is required" });
    }

    // 🔥 PRE-CHECK STOCK BEFORE CREATING RAZORPAY ORDER
    if (items && items.length > 0) {
      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product || product.isActive === false) {
          return res.status(400).json({ message: `${item.title || "Product"} is currently unavailable` });
        }
        if (product.stock < item.quantity) {
          if (product.stock === 0) {
            return res.status(400).json({ message: `${product.name} is out of stock` });
          } else {
            return res.status(400).json({ message: `Only ${product.stock} items available for ${product.name}` });
          }
        }
      }
    }

    const options = {
      amount: amount * 100, // Razorpay works in paise
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const instance = getRazorpayInstance();
    const order = await instance.orders.create(options);

    if (!order) return res.status(500).json({ message: "Some error occurred while creating order" });

    res.json(order);
  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Verify Razorpay Payment Signature and Create Order
exports.verifyRazorpayPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      address,
      paymentMethod,
      discount,
      couponCode
    } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid signature sent!" });
    }

    if (!items || items.length === 0) {
      throw new Error("Cart is empty");
    }

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      // Fetch product to check stock first for better error messages
      const product = await Product.findById(item.product).session(session);

      if (!product || product.isActive === false) {
        throw new Error(`${item.title || "Product"} is currently unavailable`);
      }

      if (product.stock < item.quantity) {
        if (product.stock === 0) {
          throw new Error(`${product.name} is out of stock`);
        } else {
          throw new Error(`Only ${product.stock} items available for ${product.name}`);
        }
      }

      // Deduct stock
      product.stock -= item.quantity;
      await product.save({ session });

      subtotal += product.price * item.quantity;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });
    }

    // 🎟️ Increment Coupon Usage
    if (couponCode) {
      const Coupon = require("../models/Coupon");
      await Coupon.findOneAndUpdate(
        { code: couponCode.toUpperCase() },
        { $inc: { usedCount: 1 }, $push: { usedBy: req.user._id } },
        { session }
      );
    }

    const orderNumber = `AW-${Date.now()}`;
    const shipping = 0; // Defaulting to free shipping
    const totalAmount = Math.max(subtotal - (discount || 0) + shipping, 0);

    const order = await Order.create([{
      orderNumber,
      user: req.user._id,
      items: orderItems,
      subtotal,
      shipping,
      discount: discount || 0,
      totalAmount,
      couponCode: couponCode || null,
      address,
      paymentMethod: paymentMethod || "Razorpay",
      orderStatus: "Placed",
      paymentStatus: "Paid",
      razorpay_order_id,
      razorpay_payment_id
    }], { session });

    await Payment.create([{
      order: order[0]._id,
      paymentMethod: paymentMethod || "Razorpay",
      paymentStatus: "Success",
      transactionId: razorpay_payment_id,
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Payment verified successfully",
      order: order[0]
    });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error("Razorpay Verification Error:", error);
    res.status(500).json({ message: error.message });
  }
};
