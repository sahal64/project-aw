const express = require("express");
const {
  addProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
} = require("../controllers/productController");

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

// USER
router.get("/", getAllProducts);
router.get("/:id", getProductById);

// ADMIN
router.post("/", authMiddleware, adminMiddleware, addProduct);
router.put("/:id", authMiddleware, adminMiddleware, updateProduct);
router.delete("/:id", authMiddleware, adminMiddleware, deleteProduct);

module.exports = router;
