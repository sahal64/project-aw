const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["product", "brand", "category"],
      required: true
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "onModel"
    },
    onModel: {
      type: String,
      required: true,
      enum: ["Product", "Brand", "Category"]
    },
    discountPercentage: {
      type: Number,
      required: true,
      min: 1,
      max: 90
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    status: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Index to help with overlapping checks and queries
offerSchema.index({ type: 1, referenceId: 1, status: 1 });

module.exports = mongoose.model("Offer", offerSchema);
