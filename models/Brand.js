const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 50
    },
    logo: {
      type: String,
      default: ""
    },
    status: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Add index for fast lookup
brandSchema.index({ name: 1 });

module.exports = mongoose.model("Brand", brandSchema);
