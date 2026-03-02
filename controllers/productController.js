const Product = require("../models/Product");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// ==========================
// ADMIN – Add Product
// ==========================
// ==========================
// ADMIN – Add Product (FINAL)
// ==========================
exports.addProduct = async (req, res) => {
  try {

    // ==========================
    // VALIDATION
    // ==========================
    const { name, brand, price, stock, category, description } = req.body;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ message: "Product name too short" });
    }

    if (!brand || brand.trim().length < 2) {
      return res.status(400).json({ message: "Brand required" });
    }

    if (!price || Number(price) <= 0) {
      return res.status(400).json({ message: "Price must be positive" });
    }

    if (stock === undefined || Number(stock) < 0) {
      return res.status(400).json({ message: "Stock cannot be negative" });
    }

    if (!["men", "women", "limited"].includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one image required" });
    }

    // ==========================
    // IMAGE HANDLING
    // ==========================
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

    // ==========================
    // SAVE PRODUCT
    // ==========================
    const product = await Product.create({
      name,
      brand,
      price,
      stock,
      category,
      description,
      images: imagePaths
    });

    res.status(201).json(product);

  } catch (error) {
    console.error("ADD PRODUCT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ==========================
// ADMIN – Update Product (Production Level)
// ==========================
// ==========================
// ADMIN – Update Product (FINAL)
// ==========================
exports.updateProduct = async (req, res) => {
  try {

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const { name, brand, price, stock, category, description } = req.body;

    // ==========================
    // VALIDATION
    // ==========================
    if (!name || name.trim().length < 3) {
      return res.status(400).json({ message: "Product name too short" });
    }

    if (!brand || brand.trim().length < 2) {
      return res.status(400).json({ message: "Brand required" });
    }

    if (!price || Number(price) <= 0) {
      return res.status(400).json({ message: "Price must be positive" });
    }

    if (stock === undefined || Number(stock) < 0) {
      return res.status(400).json({ message: "Stock cannot be negative" });
    }

    if (!["men", "women", "limited"].includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    // ==========================
    // UPDATE FIELDS
    // ==========================
    product.name = name;
    product.brand = brand;
    product.price = price;
    product.stock = stock;
    product.category = category;
    product.description = description;

    const uploadDir = path.join(__dirname, "../public/uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // ==========================
    // IMAGE REPLACEMENT (OPTIONAL)
    // ==========================
    if (req.files && req.files.length > 0) {

      const newImagePaths = [];

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];

        const fileName = `product-${Date.now()}-${i}.webp`;
        const filePath = path.join(uploadDir, fileName);

        await sharp(file.buffer)
          .resize(800, 800, { fit: "cover" })
          .webp({ quality: 80 })
          .toFile(filePath);

        newImagePaths.push(`/uploads/${fileName}`);
      }

      // Delete old images
      for (const img of product.images) {
        const oldPath = path.join(__dirname, "../public", img);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      product.images = newImagePaths;
    }

    await product.save();

    res.json(product);

  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ==========================
// ADMIN – Delete Product
// ==========================
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    for (const img of product.images) {
      const imagePath = path.join(__dirname, "../public", img);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await product.deleteOne();

    res.json({
      success: true,
      message: "Product deleted successfully"
    });

  } catch (error) {
    next(error); // 👈 send to global handler
  }
};


// ==========================
// USER – Get All Products
// (WITH CATEGORY FILTER)
// ==========================
exports.getAllProducts = async (req, res) => {
  try {
    const filter = {};
    let sortOption = { createdAt: -1 };

    if (req.query.category) {
      filter.category = req.query.category;
    }
//filter price
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      filter.price = {};
      if (req.query.minPrice !== undefined) filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice !== undefined) filter.price.$lte = Number(req.query.maxPrice);
    }

    if (req.query.sort === "priceLow") {
      sortOption = { price: 1 };
    } else if (req.query.sort === "priceHigh") {
      sortOption = { price: -1 };
    } else if (req.query.sort === "newest") {
      sortOption = { createdAt: -1 };
    }

    const products = await Product.find(filter).sort(sortOption);

    res.json({ products });

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

// ==========================
// ADMIN – Toggle Product Active Status
// ==========================
exports.toggleProductStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.isActive = !product.isActive;
    await product.save();

    res.json(product);

  } catch (error) {
    console.error("TOGGLE PRODUCT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
