const Order = require("../models/Order");

// USER – Place Order
exports.placeOrder = async (req, res) => {
  try {
    const { items, totalAmount, address } = req.body;

    const order = await Order.create({
      user: req.user._id,
      items,
      totalAmount,
      address,
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
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

// ADMIN – Update Order Status
exports.updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: req.body.status },
      { new: true }
    );

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
