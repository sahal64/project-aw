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
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
