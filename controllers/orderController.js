const Order = require("../models/Order");
const Product = require("../models/Product");

// USER – Place Order
exports.placeOrder = async (req, res) => {
  try {
    const { items, address } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`,
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });

      // Deduct stock
      product.stock -= item.quantity;
      await product.save();
    }

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
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
