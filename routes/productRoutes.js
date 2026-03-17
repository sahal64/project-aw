const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");

const {
  addProduct,
  updateProduct,
  deleteProduct,
  getAdminProducts,
  getAdminProductById,
  getAllProducts,
  getProductById,
  toggleProductStatus,
  getDealsOfWeek,
  addProductOffer,
  removeProductOffer,
  getOfferProducts,
  getSaleProducts
} = require("../controllers/productController");

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// ==========================
// USER ROUTES
// ==========================

// Get all products (supports ?category=men, ?onSale=true)
router.get("/", getAllProducts);

// Deals of the Week (Legacy/Special)
router.get("/deals", getDealsOfWeek);

// Get Offer Products (Direct)
router.get("/offers", getOfferProducts);

// Get Sale Products (Active Campaign)
router.get("/sale", getSaleProducts);

// Get single product
router.get("/:id", getProductById);


// ==========================
// ADMIN ROUTES
// ==========================

// Add product (with images)
router.post("/", authMiddleware, adminMiddleware, upload.array("images", 5), addProduct);

// Update product
router.put("/:id", authMiddleware, adminMiddleware, upload.array("images", 5), updateProduct);

// Delete product
router.delete("/:id", authMiddleware, adminMiddleware, deleteProduct);

// Get all products (Admin View)
router.get("/admin/all", authMiddleware, adminMiddleware, getAdminProducts);

// Get single product (Admin View)
router.get("/admin/:id", authMiddleware, adminMiddleware, getAdminProductById);

// Toggle product status
router.patch("/:id/status", authMiddleware, adminMiddleware, toggleProductStatus);

// Add offer to specific product
router.post("/admin/:id/offer", authMiddleware, adminMiddleware, addProductOffer);

// Remove offer from specific product
router.patch("/admin/:id/remove-offer", authMiddleware, adminMiddleware, removeProductOffer);

module.exports = router;
