const Order = require("../models/Order");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const Wallet = require("../models/wallet");

// USER – Place Order
exports.placeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, address, paymentMethod, discount, couponCode } = req.body;

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

    const orderNumber = `AW-${Date.now()}`;
    const shipping = 0; // Defaulting to free shipping as per requirement
    const totalAmount = Math.max(subtotal - (discount || 0) + shipping, 0);

    let paymentStatus = "Pending";

    if (paymentMethod === "Wallet") {
      let wallet = await Wallet.findOne({ user: req.user._id }).session(session);
      if (!wallet || wallet.balance < totalAmount) {
        throw new Error("Insufficient wallet balance");
      }

      wallet.balance -= totalAmount;
      wallet.transactions.push({
        type: "Debit",
        amount: totalAmount,
        description: `Payment for order ${orderNumber}`
      });

      await wallet.save({ session });
      paymentStatus = "Paid";
    }

    const order = await Order.create([{
      orderNumber,
      user: req.user._id,
      items: orderItems,

      subtotal: subtotal,
      discount: discount || 0,
      shipping: 0,
      totalAmount: totalAmount,

      couponCode: couponCode || null,
      address,
      paymentMethod: paymentMethod || "COD",
      orderStatus: "Placed",
      paymentStatus: paymentStatus
    }], { session });

    // If wallet was used, we need to update the transaction with the actual order ID
    if (paymentMethod === "Wallet") {
      const orderId = order[0]._id;
      let wallet = await Wallet.findOne({ user: req.user._id }).session(session);
      // Because we just saved it in this session, the latest transaction is the last one
      wallet.transactions[wallet.transactions.length - 1].order = orderId;
      await wallet.save({ session });
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
    const { sort, type } = req.query;
    const filter = { user: req.user._id };

    if (type === "returns") {
      filter["returnRequest.status"] = { $in: ["requested", "approved", "rejected"] };
    }

    let sortOption = { createdAt: -1 }; // Default: Newest first

    if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    } else if (sort === "highest") {
      sortOption = { totalAmount: -1 };
    } else if (sort === "lowest") {
      sortOption = { totalAmount: 1 };
    }

    const orders = await Order.find(filter)
      .sort(sortOption)
      .populate("items.product");

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADMIN – Get All Orders
exports.getAllOrders = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      status,
      dateFilter,
      startDate,
      endDate
    } = req.query;

    // 1. Sanitize & Validate
    page = Math.max(1, parseInt(page));
    limit = Math.min(50, Math.max(1, parseInt(limit)));
    if (search) {
      search = search.trim().substring(0, 50);
      // Backend Validation Regex: Letters, numbers, spaces, @
      const searchValidRegex = /^[A-Za-z0-9@ ]*$/;
      if (!searchValidRegex.test(search)) {
        return res.status(400).json({ message: "Invalid characters in search input." });
      }
    }

    const matchQuery = { isDeleted: { $ne: true } };

    // 2. Date Filtering Logic
    if (dateFilter || (startDate && endDate)) {
      let start, end = new Date();
      const now = new Date();

      if (dateFilter === "today") {
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
      } else if (dateFilter === "last7days") {
        start = new Date(now.setDate(now.getDate() - 7));
      } else if (dateFilter === "last30days") {
        start = new Date(now.setDate(now.getDate() - 30));
      } else if (dateFilter === "thisMonth") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateFilter === "lastMonth") {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      } else if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }

      if (start) {
        matchQuery.createdAt = { $gte: start };
        if (end) matchQuery.createdAt.$lte = end;
      }
    }

    // 2. Status Filter
    // Allow mapping pending->Placed, processing->Processing etc if needed
    // But usually these match the enum. If user passes 'pending', we map to 'Placed'
    if (status && status !== "all") {
      const statusMap = {
        pending: "Placed",
        processing: "Processing",
        shipped: "Shipped", // Future-proof if added
        delivered: "Delivered",
        cancelled: "Cancelled"
      };
      matchQuery.orderStatus = statusMap[status.toLowerCase()] || status;
    }

    // 3. Search Logic (Order ID, Name, Email)
    if (search) {
      const User = require("../models/User");
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ]
      }).select("_id");

      const userIds = matchingUsers.map(u => u._id);

      matchQuery.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "address.firstName": { $regex: search, $options: "i" } },
        { "address.lastName": { $regex: search, $options: "i" } },
        { user: { $in: userIds } }
      ];
    }

    // 4. Counts & Pagination
    const totalOrders = await Order.countDocuments(matchQuery);
    const totalPages = Math.ceil(totalOrders / limit);
    const skip = (page - 1) * limit;

    const orders = await Order.find(matchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name email")
      .populate("items.product", "name price");

    res.json({
      orders,
      totalOrders,
      totalPages,
      currentPage: page
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADMIN – Get Transactions Report
exports.getAdminTransactions = async (req, res) => {
  try {
    const { startDate, endDate, method, status } = req.query;

    let query = {
      paymentStatus: { $in: ["Paid", "Refunded"] }
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate + "T00:00:00.000Z");
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    if (method && method !== "All Methods") {
      query.paymentMethod = method;
    }

    if (status && status !== "All") {
      query.paymentStatus = status;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    const transactions = orders.map(order => ({
      transactionId: order.razorpay_payment_id || order._id,
      orderId: order.orderNumber,
      date: order.createdAt,
      amount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      status: order.paymentStatus,
      orderMongoId: order._id
    }));

    res.json(transactions);
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
      await Order.updateOne({ _id: order._id }, { $set: { orderStatus: "Cancelled" } }, { session });

      await session.commitTransaction();
      return res.json({ message: "Order cancelled and stock restored" });
    }

    // 🚚 Valid Status Flow
    const allowedTransitions = {
      Placed: ["Processing", "Cancelled"],
      Processing: ["Delivered", "Cancelled"]
    };

    if (!allowedTransitions[order.orderStatus]?.includes(status)) {
      throw new Error("Invalid status transition");
    }

    if (!order.subtotal) {
      order.subtotal = order.totalAmount + (order.discount || 0);
    }
    
    const updateData = { 
      orderStatus: status, 
      subtotal: order.subtotal 
    };

    if (status === "Delivered") {
      updateData.deliveredAt = new Date();
    }

    order.orderStatus = status;
    await Order.updateOne({ _id: order._id }, { $set: updateData }, { session });

    await session.commitTransaction();
    res.json({ message: "Order status updated", order });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// ADMIN – Get Order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user")
      .populate("items.product");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// USER – Cancel Order
exports.cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    }).session(session);

    if (!order) throw new Error("Order not found");

    if (order.orderStatus !== "Placed" && order.orderStatus !== "Processing") {
      throw new Error(`Cannot cancel order in ${order.orderStatus} status`);
    }

    order.orderStatus = "Cancelled";
    order.cancellationReason = req.body?.reason || "Cancelled by user";

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } },
        { session }
      );
    }

    // Wallet refund for paid orders
    if (order.paymentStatus === "Paid") {

      let wallet = await Wallet.findOne({ user: req.user._id }).session(session);

      if (!wallet) {
        wallet = new Wallet({
          user: req.user._id,
          balance: 0,
          transactions: []
        });
      }

      wallet.balance += order.totalAmount;

      wallet.transactions.push({
        type: "Refund",
        amount: order.totalAmount,
        order: order._id,
        description: "Refund for cancelled order"
      });

      await wallet.save({ session });
      order.paymentStatus = "Refunded";
    }

    if (!order.subtotal) {
      order.subtotal = order.totalAmount + (order.discount || 0);
    }
    await order.save({ session });

    await session.commitTransaction();

    res.json({
      message: "Order cancelled successfully",
      order
    });

  } catch (error) {

    await session.abortTransaction();

    res.status(400).json({
      message: error.message
    });

  } finally {
    session.endSession();
  }
};

// USER - Cancel Single Item in Order
exports.cancelOrderItem = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, itemId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id
    }).session(session);

    if (!order) throw new Error("Order not found");

    if (order.orderStatus === "Cancelled" || order.orderStatus === "Delivered") {
      throw new Error(`Cannot cancel item when order is ${order.orderStatus}`);
    }

    const item = order.items.id(itemId);
    if (!item) throw new Error("Item not found in order");

    if (item.itemStatus === "Cancelled") {
      throw new Error("Item is already cancelled");
    }

    // Update item status
    item.itemStatus = "Cancelled";

    // Restore stock
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: item.quantity } },
      { session }
    );

    // 💰 Recalculate Totals
    if (!order.subtotal) {
      // Fallback for older orders before recalculating
      order.subtotal = order.totalAmount + (order.discount || 0);
    }

    const activeItems = order.items.filter(i => i.itemStatus !== "Cancelled");
    let newSubtotal = 0;
    activeItems.forEach(i => {
      newSubtotal += i.price * i.quantity;
    });

    order.subtotal = newSubtotal;
    order.totalAmount = Math.max(newSubtotal - (order.discount || 0), 0);

    // Partial refund if paid
    if (order.paymentStatus === "Paid") {
      const refundAmount = item.price * item.quantity;
      let wallet = await Wallet.findOne({ user: req.user._id }).session(session);

      if (!wallet) {
        wallet = new Wallet({
          user: req.user._id,
          balance: 0,
          transactions: []
        });
      }

      wallet.balance += refundAmount;
      wallet.transactions.push({
        type: "Refund",
        amount: refundAmount,
        order: order._id,
        description: `Refund for cancelled item in order ${order.orderNumber}`
      });

      await wallet.save({ session });
    }

    // If all items are now cancelled, cancel the entire order
    const allCancelled = order.items.every(i => i.itemStatus === "Cancelled");
    if (allCancelled) {
      order.orderStatus = "Cancelled";
      if (order.paymentStatus === "Paid") {
        order.paymentStatus = "Refunded";
      }
    }

    if (!order.subtotal) {
      order.subtotal = order.totalAmount + (order.discount || 0);
    }
    await order.save({ session });
    await session.commitTransaction();

    res.json({
      message: "Item cancelled successfully",
      order
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// ADMIN – Delete Order (Soft Delete)
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Order ID" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only allow deletion if order is Cancelled
    if (order.orderStatus !== "Cancelled") {
      return res.status(400).json({ message: "Only cancelled orders can be deleted from the list." });
    }

    order.isDeleted = true;
    await order.save();

    res.json({ message: "Order deleted successfully (soft delete)" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// USER – Request Return
exports.requestReturn = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.orderStatus !== "Delivered") {
      return res.status(400).json({ message: "Only delivered orders can be returned" });
    }

    if (order.returnRequest.status !== "none") {
      return res.status(400).json({ message: "Return already requested for this order" });
    }

    // Eligibility check (7 days)
    const days = 7;
    const deliveredDate = new Date(order.deliveredAt || order.updatedAt);
    const now = new Date();
    const diff = (now - deliveredDate) / (1000 * 60 * 60 * 24);

    if (diff > days) {
      return res.status(400).json({ message: "Return period (7 days) has expired" });
    }

    order.returnRequest = {
      status: "requested",
      reason: reason || "No reason provided",
      requestedAt: new Date()
    };

    await order.save();

    res.json({ message: "Return request submitted successfully", order });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADMIN – Approve Return
exports.approveReturn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findById(req.params.id).session(session);

    if (!order) throw new Error("Order not found");

    if (order.returnRequest.status !== "requested") {
      throw new Error("No active return request for this order");
    }

    order.returnRequest.status = "approved";

    // Optional: Handle Refund if paid
    if (order.paymentStatus === "Paid") {
      let wallet = await Wallet.findOne({ user: order.user }).session(session);
      if (!wallet) {
        wallet = new Wallet({ user: order.user, balance: 0, transactions: [] });
      }
      
      wallet.balance += order.totalAmount;
      wallet.transactions.push({
        type: "Refund",
        amount: order.totalAmount,
        order: order._id,
        description: `Refund for returned order ${order.orderNumber}`
      });
      await wallet.save({ session });
      order.paymentStatus = "Refunded";
    }

    await order.save({ session });
    await session.commitTransaction();
    res.json({ message: "Return request approved", order });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// ADMIN – Reject Return
exports.rejectReturn = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.returnRequest.status !== "requested") {
      return res.status(400).json({ message: "No active return request for this order" });
    }

    order.returnRequest.status = "rejected";
    await order.save();

    res.json({ message: "Return request rejected", order });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
