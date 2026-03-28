const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 100,
      trim: true
    },

    brand: {
      type: String,
      required: true,
      trim: true
    },

    price: {
      type: Number,
      required: true,
      min: 1
    },

    stock: {
      type: Number,
      required: true,
      min: 0
    },

    category: {
      type: String,
      required: true,
      enum: ["men", "women", "limited"],
      trim: true
    },

    images: {
      type: [String],
      validate: [v => v.length > 0 && v.length <= 5, "Must have 1-5 images"]
    },

    description: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 2000,
      trim: true
    },

    isActive: {
      type: Boolean,
      default: true
    },
    offerPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 90
    },
    sku: {
      type: String,
      unique: true,
      required: true,
      trim: true
    }

  },
  { timestamps: true }
);

// Indexes for optimized searching and sorting
productSchema.index({ name: 'text', sku: 'text' }); // Text index for broader name/sku search if needed, but we'll use individual for regex
productSchema.index({ name: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ category: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);
