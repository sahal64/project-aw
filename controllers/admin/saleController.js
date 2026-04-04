const Sale = require("../../models/Sale");
const Product = require("../../models/Product");
const Brand = require("../../models/Brand");
const Category = require("../../models/Category");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// Helper: Ensure upload directory exists
const ensureUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * @desc    Create a new sale
 * @route   POST /api/admin/sales
 * @access  Admin
 */
exports.createSale = async (req, res) => {
  try {
    const { name, offerType, discountUnit, value, appliesTo, targetIds, startDate, endDate, status } = req.body;

    // 1. Basic Validation
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Banner image is required" });
    }

    // 2. Overlapping Sales Check
    // Prevent duplicate active/scheduled sales targeting the same entity
    if (status === "active" || status === "scheduled") {
      const query = {
        status: { $in: ["active", "scheduled"] },
        appliesTo,
        $or: [
            { endDate: { $gte: new Date(startDate) }, startDate: { $lte: new Date(endDate) } }
        ]
      };

      if (appliesTo !== "all") {
        query.targetIds = { $in: Array.isArray(targetIds) ? targetIds : [targetIds] };
      }

      const overlappingSale = await Sale.findOne(query);
      if (overlappingSale) {
        return res.status(400).json({
          success: false,
          message: `An overlapping active/scheduled sale already exists for this target. Sale Name: ${overlappingSale.name}`,
        });
      }
    }

    // 3. Image Processing (Resize to 1200x600)
    const uploadDir = path.join(__dirname, "../../public/uploads/sales");
    ensureUploadDir(uploadDir);

    const fileName = `sale-${Date.now()}.webp`;
    const filePath = path.join(uploadDir, fileName);

    await sharp(req.file.buffer)
      .resize(1200, 600, { fit: "cover" })
      .webp({ quality: 85 })
      .toFile(filePath);

    const bannerImage = `/uploads/sales/${fileName}`;

    // 4. Create Sale
    const sale = await Sale.create({
      name,
      bannerImage,
      offerType,
      discountUnit,
      value: Number(value),
      appliesTo,
      targetIds: Array.isArray(targetIds) ? targetIds : (targetIds ? [targetIds] : []),
      onModel: appliesTo === "all" ? undefined : (appliesTo === "product" ? "Product" : (appliesTo === "brand" ? "Brand" : "Category")),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status || "inactive",
    });

    res.status(201).json({ success: true, message: "Sale created successfully", sale });
  } catch (error) {
    console.error("CREATE SALE ERROR:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * @desc    Get all sales
 * @route   GET /api/admin/sales
 * @access  Admin
 */
exports.getSales = async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, sales });
  } catch (error) {
    console.error("GET SALES ERROR:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * @desc    Update a sale
 * @route   PUT /api/admin/sales/:id
 * @access  Admin
 */
exports.updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, value, startDate, endDate, status, appliesTo, targetIds } = req.body;

    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    // Update basic fields
    if (name) sale.name = name;
    if (value) sale.value = Number(value);
    if (startDate) sale.startDate = new Date(startDate);
    if (endDate) sale.endDate = new Date(endDate);
    if (status) sale.status = status;

    // Update appliesTo and targetIds if provided
    if (appliesTo) {
      sale.appliesTo = appliesTo;
      if (appliesTo === "all") {
        sale.targetIds = [];
        sale.onModel = undefined;
      } else {
        if (targetIds) {
          sale.targetIds = Array.isArray(targetIds) ? targetIds : [targetIds];
        }
        sale.onModel = appliesTo === "product" ? "Product" : (appliesTo === "brand" ? "Brand" : "Category");
      }
    } else if (targetIds) {
      // If only targetIds updated (unlikely but possible)
      sale.targetIds = Array.isArray(targetIds) ? targetIds : [targetIds];
    }

    // Handle Image if provided
    if (req.file) {
      const uploadDir = path.join(__dirname, "../../public/uploads/sales");
      ensureUploadDir(uploadDir);

      const fileName = `sale-${Date.now()}.webp`;
      const filePath = path.join(uploadDir, fileName);

      await sharp(req.file.buffer)
        .resize(1200, 600, { fit: "cover" })
        .webp({ quality: 85 })
        .toFile(filePath);

      // Optionally delete old image
      const oldPath = path.join(__dirname, "../../public", sale.bannerImage);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

      sale.bannerImage = `/uploads/sales/${fileName}`;
    }

    await sale.save();
    res.status(200).json({ success: true, message: "Sale updated successfully", sale });
  } catch (error) {
    console.error("UPDATE SALE ERROR:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * @desc    Delete a sale
 * @route   DELETE /api/admin/sales/:id
 * @access  Admin
 */
exports.deleteSale = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findById(id);

    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    if (sale.status === "active") {
      return res.status(400).json({ success: false, message: "Cannot delete an active sale. Please deactivate it first." });
    }

    // Delete image
    const imagePath = path.join(__dirname, "../../public", sale.bannerImage);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

    await sale.deleteOne();
    res.status(200).json({ success: true, message: "Sale deleted successfully" });
  } catch (error) {
    console.error("DELETE SALE ERROR:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * @desc    Toggle sale status
 * @route   PATCH /api/admin/sales/:id/status
 * @access  Admin
 */
exports.toggleSaleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findById(id);

    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    // Toggle between active and inactive
    const newStatus = sale.status === "active" ? "inactive" : "active";
    
    // Auto check for expiry
    const now = new Date();
    if (newStatus === "active" && sale.endDate < now) {
      sale.status = "expired";
    } else {
      sale.status = newStatus;
    }

    await sale.save();
    res.status(200).json({ success: true, message: `Sale status changed to ${sale.status}`, status: sale.status });
  } catch (error) {
    console.error("TOGGLE SALE STATUS ERROR:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
