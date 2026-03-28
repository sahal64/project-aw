const Product = require("../models/Product");
const Offer = require("../models/Offer");
const Sale = require("../models/Sale");
const Brand = require("../models/Brand");
const Category = require("../models/Category");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Helper to calculate discounted prices
const applyOffers = async (products) => {
  const now = new Date();

  // Fetch active specialized offers (Old system)
  const activeOffers = await Offer.find({
    status: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  }).populate("referenceId");

  // Fetch active broad sales campaigns (New system)
  // We populate targetIds to get names for Brand/Category matching
  const activeSales = await Sale.find({
    status: "active",
    startDate: { $lte: now },
    endDate: { $gte: now }
  }).populate("targetIds");

  return products.map(product => {
    let highestDiscount = 0;
    let saleName = "";
    const pObj = product.toObject ? product.toObject() : product;

    // A. Start with Product's internal offerPercentage
    highestDiscount = pObj.offerPercentage || 0;
    if (highestDiscount > 0) saleName = "Product Offer";

    // B. Check specialized Offers (Old system)
    activeOffers.forEach(offer => {
      let isApplicable = false;
      if (!offer.referenceId) return;

      if (offer.type === "product" && offer.referenceId._id.toString() === pObj._id.toString()) {
        isApplicable = true;
      } else if (offer.type === "brand" && offer.referenceId.name.toLowerCase() === pObj.brand.toLowerCase()) {
        isApplicable = true;
      } else if (offer.type === "category") {
          let mappedCat = "limited";
          const catName = offer.referenceId.name.toLowerCase();
          if (catName.includes("women")) mappedCat = "women";
          else if (catName.includes("men")) mappedCat = "men";
          if (mappedCat === pObj.category) isApplicable = true;
      }

      if (isApplicable && offer.discountPercentage > highestDiscount) {
        highestDiscount = offer.discountPercentage;
        saleName = "Offer"; 
      }
    });

    // C. Check broad Sales Campaigns (New system)
    activeSales.forEach(sale => {
      let isApplicable = false;
      if (sale.appliesTo === "all") {
        isApplicable = true;
      } else if (sale.appliesTo === "product") {
        isApplicable = sale.targetIds.some(t => t._id.toString() === pObj._id.toString());
      } else if (sale.appliesTo === "brand") {
        // Match product.brand (string) against sale target names
        isApplicable = sale.targetIds.some(t => t.name.toLowerCase() === pObj.brand.toLowerCase());
      } else if (sale.appliesTo === "category") {
        // Match product.category (enum string) against sale target names
        isApplicable = sale.targetIds.some(t => {
           const targetName = t.name.toLowerCase();
           let mappedCat = "limited";
           if (targetName.includes("women")) mappedCat = "women";
           else if (targetName.includes("men")) mappedCat = "men";
           return mappedCat === pObj.category;
        });
      }

      if (isApplicable) {
        let currentSaleDiscount = 0;
        if (sale.discountUnit === "percentage") {
          currentSaleDiscount = sale.value;
        } else {
          // Flat discount converted to percentage for comparison
          currentSaleDiscount = (sale.value / pObj.price) * 100;
        }

        if (currentSaleDiscount > highestDiscount) {
          highestDiscount = currentSaleDiscount;
          saleName = sale.name;
        }
      }
    });

    const finalPrice = highestDiscount > 0 
      ? Math.round(pObj.price - (pObj.price * highestDiscount / 100))
      : pObj.price;

    return {
      ...pObj,
      finalPrice: Math.max(0, finalPrice),
      discountPercentage: Math.min(100, Math.round(highestDiscount)),
      saleName
    };
  });
};

// ==========================
// ADMIN – Add Product
// ==========================
// ==========================
// ADMIN – Add Product (FINAL)
// ==========================
const generateUniqueSKU = async (brand) => {
  const sanitizedBrand = brand.toUpperCase().replace(/\s/g, '');
  let sku;
  let exists = true;

  while (exists) {
    const random = Math.floor(1000 + Math.random() * 9000); // 4 digit random
    sku = `AW-${sanitizedBrand}-${random}`;
    const product = await Product.findOne({ sku });
    if (!product) exists = false;
  }
  return sku;
};

exports.addProduct = async (req, res) => {
  try {
    let { name, brand, price, stock, category, description, offerPercentage } = req.body;

    // ==========================
    // SANITIZATION
    // ==========================
    name = name?.trim();
    brand = brand?.trim();
    description = description?.trim();

    // ==========================
    // VALIDATION
    // ==========================
    if (!name || !/^[A-Za-z0-9\s-']{3,100}$/.test(name)) {
      return res.status(400).json({ success: false, message: "Product name must be 3–100 characters and can include letters, numbers, spaces, hyphens, and apostrophes." });
    }

    if (!brand || brand.length < 2) {
      return res.status(400).json({ success: false, message: "Brand name is required" });
    }

    if (!price || isNaN(price) || Number(price) <= 0) {
      return res.status(400).json({ success: false, message: "Price must be a number greater than 0" });
    }

    if (stock === undefined || isNaN(stock) || Number(stock) < 0 || !Number.isInteger(Number(stock))) {
      return res.status(400).json({ success: false, message: "Stock must be a non-negative integer" });
    }

    if (!["men", "women", "limited"].includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid category selected" });
    }

    if (offerPercentage !== undefined) {
      if (isNaN(offerPercentage) || Number(offerPercentage) < 0 || Number(offerPercentage) > 90) {
        return res.status(400).json({ success: false, message: "Offer percentage must be between 0 and 90" });
      }
    }

    if (!description || description.length < 10 || description.length > 2000) {
      return res.status(400).json({ success: false, message: "Description must be between 10 and 2000 characters" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "At least one image is required" });
    }

    if (req.files.length > 5) {
      return res.status(400).json({ success: false, message: "Maximum 5 images allowed" });
    }

    // ==========================
    // DUPLICATE CHECK
    // ==========================
    const existingProduct = await Product.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existingProduct) {
      return res.status(400).json({ success: false, message: "A product with this name already exists" });
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

  // ==========================
  // SECURITY: CHECK FILE TYPE
  // ==========================
  if (!file.mimetype.startsWith("image/")) {
    return res.status(400).json({
      success: false,
      message: "Invalid file type. Only image files are allowed."
    });
  }

  const fileName = `product-${Date.now()}-${i}.webp`;
  const filePath = path.join(uploadDir, fileName);

  await sharp(file.buffer)
    .resize(800, 800, { fit: "cover" })
    .webp({ quality: 80 })
    .toFile(filePath);

  imagePaths.push(`/uploads/${fileName}`);
}

    // ==========================
    // GENERATE UNIQUE SKU
    // ==========================
    const sku = await generateUniqueSKU(brand);

    // ==========================
    // SAVE PRODUCT
    // ==========================
    const product = await Product.create({
      name,
      brand,
      price: Number(price),
      stock: Number(stock),
      category,
      description,
      images: imagePaths,
      offerPercentage: Number(offerPercentage) || 0,
      sku
    });

    res.status(201).json({ success: true, product });

  } catch (error) {
    console.error("ADD PRODUCT ERROR:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
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

    const { name, brand, price, stock, category, description, offerPercentage, isActive } = req.body;

    // ==========================
    // VALIDATION
    // ==========================
    if (!name || !/^[A-Za-z0-9\s-']{3,100}$/.test(name)) {
      return res.status(400).json({ message: "Product name must be 3–100 characters and can include letters, numbers, spaces, hyphens, and apostrophes." });
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

    if (offerPercentage !== undefined) {
      if (isNaN(offerPercentage) || Number(offerPercentage) < 0 || Number(offerPercentage) > 90) {
        return res.status(400).json({ message: "Offer must be 0-90%" });
      }
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
    if (offerPercentage !== undefined) product.offerPercentage = Number(offerPercentage);
    if (isActive !== undefined) product.isActive = isActive === "true" || isActive === true;

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
// ADMIN – Get All Products
// ==========================
exports.getAdminProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } }
      ];
    }

    const total = await Product.countDocuments(filter);
    const productsData = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const products = await applyOffers(productsData);

    res.json({
      success: true,
      products,
      total,
      page,
      pages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error("ADMIN GET PRODUCTS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load products"
    });
  }
};

// ==========================
// ADMIN – Get Single Product
// ==========================
exports.getAdminProductById = async (req, res) => {
  try {
    const productData = await Product.findById(req.params.id);

    if (!productData) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const products = await applyOffers([productData]);

    res.json({
      success: true,
      product: products[0]
    });

  } catch (error) {

    console.error("ADMIN GET PRODUCT ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load product"
    });

  }
};


// ==========================
// USER – Get All Products
// (WITH CATEGORY FILTER)
// ==========================
exports.getAllProducts = async (req, res) => {
  try {
    const filter = { isActive: { $ne: false } }; // Only show active products to users
    let sortOption = { createdAt: -1 };

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    if (req.query.category) {
      filter.category = req.query.category.toLowerCase();
    }
    
    // Price filter
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      filter.price = {};
      if (req.query.minPrice !== undefined) filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice !== undefined) filter.price.$lte = Number(req.query.maxPrice);
    }

    // Search filter
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: "i" };
    }

    if (req.query.sort === "priceLow") {
      sortOption = { price: 1 };
    } else if (req.query.sort === "priceHigh") {
      sortOption = { price: -1 };
    } else if (req.query.sort === "newest") {
      sortOption = { createdAt: -1 };
    }

    const total = await Product.countDocuments(filter);
    const productsData = await Product.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    let products = await applyOffers(productsData);

    if (req.query.onSale === "true") {
      products = products.filter(p => p.discountPercentage > 0);
    }

    res.json({ 
      success: true, 
      products,
      total,
      page,
      pages: Math.ceil(total / limit)
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

    const productsWithOffers = await applyOffers([product]);
    const p = productsWithOffers[0];
    
    res.json(p);
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

// ==========================
// USER – Get Deals of the Week
// (Highest discounts top 3)
// ==========================
exports.getDealsOfWeek = async (req, res) => {
  try {
    // 1. Fetch all active products
    const productsData = await Product.find({ isActive: { $ne: false } });

    // 2. Apply discount logic helper
    const productsWithOffers = await applyOffers(productsData);

    // 3. Filter for discounted products & Sort by percentage descending
    const deals = productsWithOffers
      .filter(p => p.discountPercentage > 0)
      .sort((a, b) => b.discountPercentage - a.discountPercentage)
      .slice(0, 3); // Top 3

    res.json({ success: true, deals });
  } catch (error) {
    console.error("GET DEALS ERROR:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================
// ADMIN – Add Product Offer
// ==========================
exports.addProductOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { percentage } = req.body;

    if (percentage < 1 || percentage > 90) {
      return res.status(400).json({ success: false, message: "Offer must be between 1 and 90%" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    product.offerPercentage = percentage;
    await product.save();

    res.json({ success: true, message: "Offer added successfully", offerPercentage: product.offerPercentage });
  } catch (error) {
    console.error("ADD OFFER ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==========================
// ADMIN – Remove Product Offer
// ==========================
exports.removeProductOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    product.offerPercentage = 0;
    await product.save();

    res.json({ success: true, message: "Offer removed successfully" });
  } catch (error) {
    console.error("REMOVE OFFER ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==========================
// USER – Get Offer Products
// ==========================
exports.getOfferProducts = async (req, res) => {
  try {
    const products = await Product.find({ offerPercentage: { $gt: 0 }, isActive: { $ne: false } })
      .sort({ offerPercentage: -1 })
      .limit(3);

    const productsWithFinalPrice = products.map(p => {
      const pObj = p.toObject();
      const finalPrice = Math.round(pObj.price - (pObj.price * pObj.offerPercentage / 100));
      return {
        ...pObj,
        finalPrice,
        discountPercentage: pObj.offerPercentage
      };
    });

    res.json({ success: true, products: productsWithFinalPrice });
  } catch (error) {
    console.error("GET OFFER PRODUCTS ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==========================
// USER – Get Sale Products
// (Filtered by active sale)
// ==========================
exports.getSaleProducts = async (req, res) => {
  try {
    const now = new Date();
    // 1. Find active sale
    const activeSale = await Sale.findOne({
      status: "active",
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    if (!activeSale) {
      return res.json({ success: true, products: [] });
    }

    // 2. Fetch all active products
    const productsData = await Product.find({ isActive: { $ne: false } });

    // 3. Apply discount logic
    const productsWithOffers = await applyOffers(productsData);

    // 4. Filter for products matching this specific sale name
    // (applyOffers identifies the saleName if it's the highest discount)
    const saleProducts = productsWithOffers
      .filter(p => p.saleName === activeSale.name)
      .sort((a, b) => b.discountPercentage - a.discountPercentage)
      .slice(0, 3)
      .map(p => ({
        _id: p._id,
        name: p.name,
        image: p.images[0],
        price: p.price,
        discount: p.discountPercentage,
        finalPrice: p.finalPrice
      }));

    res.json({ success: true, products: saleProducts });
  } catch (error) {
    console.error("GET SALE PRODUCTS ERROR:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
