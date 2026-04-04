const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

// Routes
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const errorMiddleware = require("./middlewares/errorMiddleware");
const userRoutes = require("./routes/userRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const walletRoutes = require("./routes/walletRoutes");
const couponRoutes = require("./routes/couponRoutes");
const cartRoutes = require("./routes/cartRoutes");
const saleRoutes = require("./routes/admin/saleRoutes");


dotenv.config();
connectDB();

const adminRoutes = require("./routes/adminRoutes");

const app = express();

/* Middleware */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* API Routes */
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/sales", require("./routes/saleRoutes"));
app.use("/api/admin/sales", saleRoutes);
app.use("/api/admin", adminRoutes);


/* Prevent back-button access to protected pages after logout */
app.use((req, res, next) => {
  // Apply no-cache headers to protected HTML pages
  if (req.path.startsWith("/admin/") || req.path.startsWith("/user/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

/* Serve Frontend */
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

/* Root Route */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});


/* 404 Handler */
app.use((req, res, next) => {
  const error = new Error("Route not found");
  error.statusCode = 404;
  next(error);
});

/* Global Error Handler */
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 AeroWatch running on port ${PORT}`);
});
