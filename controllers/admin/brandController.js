const Brand = require("../../models/Brand");
const Product = require("../../models/Product");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// @desc    Create new brand
// @route   POST /api/admin/brands
exports.createBrand = async (req, res) => {
  try {
    let { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Brand name is required" });
    }

    // Strict validation and sanitization
    name = name.trim().replace(/\s+/g, ' ');
    const nameRegex = /^[A-Za-z0-9 ]{2,50}$/;

    if (!nameRegex.test(name)) {
      return res.status(400).json({ 
        message: "Brand name must be 2-50 characters and contain only letters, numbers, and spaces" 
      });
    }

    const existingBrand = await Brand.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existingBrand) {
      return res.status(400).json({ message: "Brand already exists" });
    }

    let logo = "";
    if (req.file) {
      if (req.file.size > 2 * 1024 * 1024) {
        return res.status(400).json({ message: "Logo size should not exceed 2MB" });
      }

      const uploadDir = path.join(__dirname, "../..", "public", "uploads", "brands");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const fileName = `brand-${Date.now()}.webp`;
      const filePath = path.join(uploadDir, fileName);
      
      await sharp(req.file.buffer)
        .resize(200, 200, { fit: "cover" })
        .webp({ quality: 80 })
        .toFile(filePath);

      logo = `/uploads/brands/${fileName}`;
    }

    const brand = await Brand.create({
      name,
      logo
    });

    res.status(201).json({
      success: true,
      message: "Brand created successfully",
      brand
    });
  } catch (error) {
    console.error("Create Brand Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get all brands with product count
// @route   GET /api/admin/brands
exports.getAllBrands = async (req, res) => {
  try {
    const { search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const matchStage = {};
    if (search) {
      const sanitizedSearch = search.trim().slice(0, 50);
      if (sanitizedSearch) {
        matchStage.name = { $regex: new RegExp(escapeRegex(sanitizedSearch), "i") };
      }
    }

    // Pipeline for basic matching and counting
    const countPipeline = [];
    if (Object.keys(matchStage).length > 0) {
      countPipeline.push({ $match: matchStage });
    }
    countPipeline.push({ $count: "total" });
    
    // Execute both in parallel
    const [countResult] = await Brand.aggregate(countPipeline);
    const totalCount = countResult ? countResult.total : 0;

    const pipeline = [];
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "products",
          let: { brandName: "$name" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$brand", "$$brandName"] }
              }
            }
          ],
          as: "products"
        }
      },
      {
        $project: {
          name: 1,
          logo: 1,
          status: 1,
          createdAt: 1,
          productCount: { $size: "$products" }
        }
      }
    );

    const brands = await Brand.aggregate(pipeline);
    
    res.json({
      success: true,
      brands,
      total: totalCount,
      page,
      pages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error("Get All Brands Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update brand
// @route   PUT /api/admin/brands/:id
exports.updateBrand = async (req, res) => {
  try {
    let { name } = req.body;
    const { id } = req.params;

    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    if (name) {
      name = name.trim().replace(/\s+/g, ' ');
      const nameRegex = /^[A-Za-z0-9 ]{2,50}$/;

      if (!nameRegex.test(name)) {
        return res.status(400).json({ 
          message: "Brand name must be 2-50 characters and contain only letters, numbers, and spaces" 
        });
      }

      const existingBrand = await Brand.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, "i") }, 
        _id: { $ne: id } 
      });
      if (existingBrand) {
        return res.status(400).json({ message: "Another brand with this name already exists" });
      }
      brand.name = name;
    }

    if (req.file) {
      if (req.file.size > 2 * 1024 * 1024) {
        return res.status(400).json({ message: "Logo size should not exceed 2MB" });
      }

      const uploadDir = path.join(__dirname, "../..", "public", "uploads", "brands");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      if (brand.logo) {
        const oldPath = path.join(__dirname, "../..", "public", brand.logo);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const fileName = `brand-${Date.now()}.webp`;
      const filePath = path.join(uploadDir, fileName);
      
      await sharp(req.file.buffer)
        .resize(200, 200, { fit: "cover" })
        .webp({ quality: 80 })
        .toFile(filePath);

      brand.logo = `/uploads/brands/${fileName}`;
    }

    await brand.save();

    res.json({
      success: true,
      message: "Brand updated successfully",
      brand
    });
  } catch (error) {
    console.error("Update Brand Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete brand
// @route   DELETE /api/admin/brands/:id
exports.deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Check if products exist for this brand
    const productCount = await Product.countDocuments({ brand: brand.name });
    if (productCount > 0) {
      return res.status(400).json({ message: "Cannot delete brand. Products are associated with it." });
    }

    // Delete logo file
    if (brand.logo) {
      const filePath = path.join(__dirname, "../..", "public", brand.logo);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Brand.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Brand deleted successfully"
    });
  } catch (error) {
    console.error("Delete Brand Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Toggle brand status
// @route   PATCH /api/admin/brands/:id/status
exports.toggleBrandStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    brand.status = !brand.status;
    await brand.save();

    res.json({
      success: true,
      message: `Brand status changed to ${brand.status ? "Active" : "Inactive"}`,
      status: brand.status
    });
  } catch (error) {
    console.error("Toggle Brand Status Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
