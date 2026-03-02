const Order = require("../models/Order");
const Product = require("../models/Product");
const mongoose = require("mongoose");

// USER – Place Order
exports.placeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, address, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      throw new Error("Cart is empty");
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findOneAndUpdate(
      { 
           _id: item.product, 
           stock: { $gte: item.quantity },
           isActive: true
       },
           { $inc: { stock: -item.quantity } },
           { new: true, session }
    );

      if (!product) {
        throw new Error("Product unavailable or insufficient stock");
      }

      totalAmount += product.price * item.quantity;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });
    }

    const orderNumber = `AW-${Date.now()}`;

    const order = await Order.create([{
      orderNumber,
      user: req.user._id,
      items: orderItems,
      totalAmount,
      address,
      paymentMethod: paymentMethod || "COD",
      orderStatus: "Placed",
      paymentStatus: "Pending"
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(order[0]);

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};
// USER – Get My Orders
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("items.product");

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADMIN – Get All Orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user")
      .populate("items.product");

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// USER – Get Single Order
exports.getSingleOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate("items.product");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ADMIN – Update Order Status (Strong Version)
exports.updateOrderStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id).session(session);
    if (!order) throw new Error("Order not found");

    // 🚫 Delivered orders cannot be changed
    if (order.orderStatus === "Delivered") {
      throw new Error("Delivered orders cannot be modified");
    }

    // 🔁 Handle Cancellation (with stock restore)
    if (status === "Cancelled") {

      if (order.orderStatus !== "Placed") {
        throw new Error("Only placed orders can be cancelled");
      }

      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } },
          { session }
        );
      }

      order.orderStatus = "Cancelled";
      await order.save({ session });

      await session.commitTransaction();
      return res.json({ message: "Order cancelled and stock restored" });
    }

    // 🚚 Valid Status Flow
    const allowedTransitions = {
      Placed: ["Shipped"],
      Shipped: ["Delivered"]
    };

    if (!allowedTransitions[order.orderStatus]?.includes(status)) {
      throw new Error("Invalid status transition");
    }

    order.orderStatus = status;
    await order.save({ session });

    await session.commitTransaction();
    res.json({ message: "Order status updated", order });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};
