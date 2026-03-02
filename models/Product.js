const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true 
    },

    brand: { 
      type: String, 
      required: true 
    },

    price: { 
  type: Number, 
  required: true,
  min: 0
},

stock: { 
  type: Number, 
  required: true,
  min: 0
},

    category: { 
      type: String, 
      required: true,
      enum: ["men", "women", "limited"]
    },

    images: [
      {
        type: String
      }
    ],

    description: { 
      type: String 
    },

    // ✅ ADD THIS
    isActive: {
      type: Boolean,
      default: true
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
