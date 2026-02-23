const Product = require("../models/Product");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// ==========================
// ADMIN – Add Product
// ==========================
exports.addProduct = async (req, res) => {
  try {

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one image required" });
    }

    const uploadDir = path.join(__dirname, "../public/uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const imagePaths = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];

      const fileName = `product-${Date.now()}-${i}.webp`;
      const filePath = path.join(uploadDir, fileName);

      await sharp(file.buffer)
        .resize(800, 800, { fit: "cover" })
        .webp({ quality: 80 })
        .toFile(filePath);

      imagePaths.push(`/uploads/${fileName}`);
    }

    const product = await Product.create({
      name: req.body.name,
      brand: req.body.brand,
      price: req.body.price,
      stock: req.body.stock,
      category: req.body.category,
      description: req.body.description,
      images: imagePaths
    });

    res.status(201).json(product);

  } catch (error) {
    console.error("ADD PRODUCT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ==========================
// ADMIN – Update Product
// ==========================
exports.updateProduct = async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(updatedProduct);
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ==========================
// ADMIN – Delete Product
// ==========================
exports.deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ==========================
// USER – Get All Products
// (WITH CATEGORY FILTER)
// ==========================
exports.getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.category) {
      filter.category = req.query.category;
    }

    const products = await Product.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ==========================
// USER – Get Single Product
// ==========================
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("GET PRODUCT BY ID ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
