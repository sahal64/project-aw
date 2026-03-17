const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Sale name is required"],
      trim: true,
      minlength: [3, "Sale name must be at least 3 characters"],
      maxlength: [80, "Sale name must be at most 80 characters"],
      validate: {
        validator: function (v) {
          return /^[A-Za-z0-9 ]{3,80}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid sale name! Only alphanumeric characters and spaces are allowed.`,
      },
    },
    bannerImage: {
      type: String,
      required: [true, "Banner image is required"],
    },
    offerType: {
      type: String,
      required: [true, "Offer type is required"],
      enum: ["percentage", "flat"],
    },
    discountUnit: {
      type: String,
      required: [true, "Discount unit is required"],
      enum: ["percentage", "currency"],
    },
    value: {
      type: Number,
      required: [true, "Discount value is required"],
      validate: {
        validator: function (v) {
          if (this.discountUnit === "percentage") {
            return v >= 1 && v <= 90;
          }
          return v >= 1;
        },
        message: (props) => {
          if (this.discountUnit === "percentage") {
            return "Percentage discount must be between 1 and 90";
          }
          return "Currency discount must be at least 1";
        },
      },
    },
    appliesTo: {
      type: String,
      required: [true, "Applies to is required"],
      enum: ["all", "product", "brand", "category"],
    },
    targetIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "onModel",
      },
    ],
    onModel: {
      type: String,
      enum: ["Product", "Brand", "Category"],
      required: function () {
        return this.appliesTo !== "all";
      },
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
      validate: {
        validator: function (v) {
          // Only validate on creation
          if (this.isNew) {
            return v >= new Date().setHours(0, 0, 0, 0);
          }
          return true;
        },
        message: "Start date cannot be in the past",
      },
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function (v) {
          return v > this.startDate;
        },
        message: "End date must be after start date",
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "scheduled", "expired"],
      default: "inactive",
    },
  },
  { timestamps: true }
);

// Indexes
saleSchema.index({ status: 1, startDate: 1, endDate: 1 });
saleSchema.index({ appliesTo: 1, targetIds: 1 });

module.exports = mongoose.model("Sale", saleSchema);
