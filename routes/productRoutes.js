const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");


const {
  addProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
} = require("../controllers/productController");

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");


// ==========================
// USER ROUTES
// ==========================

// Get all products (supports ?category=men)
router.get("/", getAllProducts);

// Get single product
router.get("/:id", getProductById);


// ==========================
// ADMIN ROUTES
// ==========================

// Add product
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  upload.array("images", 5),
  addProduct
);


// Update product
router.put("/:id", authMiddleware, adminMiddleware, updateProduct);

// Delete product
router.delete("/:id", authMiddleware, adminMiddleware, deleteProduct);


module.exports = router;
