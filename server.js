const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const morgan = require("morgan");
const cors = require("cors");

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
const adminRoutes = require("./routes/adminRoutes");

dotenv.config();
connectDB();

const app = express();

app.set("trust proxy", 1);
app.use(morgan("dev"));

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

/* Middleware */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ================= API ROUTES ================= */
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

/* ================= CACHE CONTROL ================= */
app.use((req, res, next) => {
  if (req.path.startsWith("/admin") || req.path.startsWith("/user")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

/* ================= STATIC FILES ================= */
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.redirect("/user/home.html");
});

/* ================= OPTIONAL CLEAN ROUTES ================= */
app.get("/shop", (req, res) => {
  res.sendFile(path.join(__dirname, "public/user/product.html"));
});

app.get("/single-product", (req, res) => {
  res.sendFile(path.join(__dirname, "public/user/single-product.html"));
});

app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "public/user/about.html"));
});

app.get("/contact", (req, res) => {
  res.sendFile(path.join(__dirname, "public/user/contact.html"));
});

/* ================= 404 ================= */
app.use((req, res, next) => {
  const error = new Error("Route not found");
  error.statusCode = 404;
  next(error);
});

/* ================= ERROR HANDLER ================= */
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 AeroWatch running on port ${PORT}`);
});