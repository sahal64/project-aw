const Category = require("../models/Category");
const Product = require("../models/Product");

/* ================= GET ALL ================= */
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false,status:"Active"});

    const result = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({ category: cat._id });
        return {
          ...cat.toObject(),
          productCount: count
        };
      })
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Error fetching categories" });
  }
};

/* ================= ADD ================= */
exports.addCategory = async (req, res) => {
  try {
    const { name, status } = req.body;

    const existing = await Category.findOne({ name });

    if (existing) {
      return res.status(400).json({
        message: "Category already exists"
      });
    }

    await Category.create({ name, status });

    res.json({ message: "Category added successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error adding category" });
  }
};

/* ================= UPDATE ================= */
exports.updateCategory = async (req, res) => {
  try {
    const { name, status } = req.body;
    const id = req.params.id;

    await Category.findByIdAndUpdate(id, { name, status });

    res.json({ message: "Category updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating category" });
  }
};

/* ================= DELETE (SOFT DELETE) ================= */
exports.deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;

    const productCount = await Product.countDocuments({ category: id });

    if (productCount > 0) {
      return res.status(400).json({
        message: "Cannot delete. Products are linked to this category."
      });
    }

    await Category.findByIdAndUpdate(id, { isDeleted: true });

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting category" });
  }
};
