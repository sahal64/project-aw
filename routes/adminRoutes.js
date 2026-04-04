const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const productController = require("../controllers/productController");
const categoryController = require("../controllers/categoryController");
const userController = require("../controllers/userController");
const dashboardController = require("../controllers/dashboardController");
const couponController = require("../controllers/couponController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const reportController = require("../controllers/reportController");
const brandController = require("../controllers/admin/brandController");
const brandRoutes = require("./admin/brandRoutes");
const offerRoutes = require("./admin/offerRoutes");

// Apply protection to all routes in this file
router.use(authMiddleware, adminMiddleware);

// --- Dashboard ---
router.get("/dashboard/stats", dashboardController.getDashboardStats);
router.get("/dashboard/revenue-chart", dashboardController.getRevenueChart);
router.get("/reports/sales", reportController.getSalesReport);

// --- Products ---
router.get("/products", productController.getAdminProducts);
router.get("/products/:id", productController.getAdminProductById);  // ADD THIS LINE
router.post("/products", upload.array("images", 5), productController.addProduct);
router.put("/products/:id", upload.array("images", 5), productController.updateProduct);
router.delete("/products/:id", productController.deleteProduct);
router.patch("/products/:id/toggle", productController.toggleProductStatus);

// --- Orders ---
router.get("/orders", orderController.getAllOrders);
router.get("/orders/:id", orderController.getOrderById);
router.put("/orders/:id", orderController.updateOrderStatus);
router.delete("/orders/:id", orderController.deleteOrder);
router.put("/orders/:id/return/approve", orderController.approveReturn);
router.put("/orders/:id/return/reject", orderController.rejectReturn);
router.get("/transactions", orderController.getAdminTransactions);

// --- Categories ---
router.get("/categories", categoryController.getAllCategories);
router.post("/categories", categoryController.addCategory);
router.put("/categories/:id", categoryController.updateCategory);
router.delete("/categories/:id", categoryController.deleteCategory);

// --- Users ---
router.get("/users", userController.getAllUsers); // Backward compatibility
router.get("/customers", userController.getAllUsers); // Main customer route with pagination/search
router.get("/customers/:id", userController.getCustomerDetails);
router.delete("/customers/:id", userController.deleteCustomer);
router.patch("/users/:id/block", userController.toggleUserBlock);

// --- Coupons ---
router.get("/coupons", couponController.getAllCoupons);
router.post("/coupons", couponController.createCoupon);
router.put("/coupons/:id", couponController.updateCoupon);
router.delete("/coupons/:id", couponController.deleteCoupon);
router.patch("/coupons/:id/toggle", couponController.toggleCouponStatus);

// --- Brands ---
router.use("/brands", brandRoutes);

// --- Offers ---
router.use("/offers", offerRoutes);

module.exports = router;
