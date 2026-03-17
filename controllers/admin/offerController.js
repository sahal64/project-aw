const Offer = require("../../models/Offer");
const Product = require("../../models/Product");
const Brand = require("../../models/Brand");
const Category = require("../../models/Category");

// Helper to validate if reference exists
const validateReference = async (type, referenceId) => {
  let model;
  let onModel;
  switch (type) {
    case "product":
      model = Product;
      onModel = "Product";
      break;
    case "brand":
      model = Brand;
      onModel = "Brand";
      break;
    case "category":
      model = Category;
      onModel = "Category";
      break;
    default:
      return null;
  }
  const exists = await model.findById(referenceId);
  return exists ? onModel : null;
};

// @desc    Create new offer
// @route   POST /api/admin/offers
exports.createOffer = async (req, res) => {
  try {
    const { type, referenceId, discountPercentage, startDate, endDate } = req.body;

    // 1. Basic validation
    if (!type || !referenceId || !discountPercentage || !startDate || !endDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (discountPercentage < 1 || discountPercentage > 90) {
      return res.status(400).json({ message: "Discount must be between 1 and 90" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (start < now) {
      return res.status(400).json({ message: "Start date cannot be in the past" });
    }

    if (end <= start) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    // 2. Validate reference exists
    const onModel = await validateReference(type, referenceId);
    if (!onModel) {
      return res.status(400).json({ message: `Invalid ${type} reference ID` });
    }

    // 3. Check for overlapping active offers on the same target
    const overlapping = await Offer.findOne({
      type,
      referenceId,
      status: true,
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlapping) {
      return res.status(400).json({ message: "An active offer already exists for this target during the selected period" });
    }

    const offer = await Offer.create({
      type,
      referenceId,
      onModel,
      discountPercentage,
      startDate: start,
      endDate: end
    });

    res.status(201).json({
      success: true,
      message: "Offer created successfully",
      offer
    });

  } catch (error) {
    console.error("Create Offer Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get all offers
// @route   GET /api/admin/offers
exports.getOffers = async (req, res) => {
  try {
    const offers = await Offer.find()
      .populate("referenceId", "name")
      .sort({ createdAt: -1 });

    res.json(offers);
  } catch (error) {
    console.error("Get Offers Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update offer
// @route   PUT /api/admin/offers/:id
exports.updateOffer = async (req, res) => {
  try {
    const { discountPercentage, startDate, endDate } = req.body;
    const { id } = req.params;

    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (discountPercentage) {
      if (discountPercentage < 1 || discountPercentage > 90) {
        return res.status(400).json({ message: "Discount must be between 1 and 90" });
      }
      offer.discountPercentage = discountPercentage;
    }

    if (startDate) {
      const start = new Date(startDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (start < now) {
        return res.status(400).json({ message: "Start date cannot be in the past" });
      }
      offer.startDate = start;
    }

    if (endDate) {
      const end = new Date(endDate);
      if (end <= offer.startDate) {
        return res.status(400).json({ message: "End date must be after start date" });
      }
      offer.endDate = end;
    }

    // Check for overlap if dates changed and offer is active
    if (offer.status && (startDate || endDate)) {
      const overlapping = await Offer.findOne({
        _id: { $ne: id },
        type: offer.type,
        referenceId: offer.referenceId,
        status: true,
        $or: [
          { startDate: { $lte: offer.endDate }, endDate: { $gte: offer.startDate } }
        ]
      });

      if (overlapping) {
        return res.status(400).json({ message: "Update would cause an overlap with an existing active offer" });
      }
    }

    await offer.save();

    res.json({
      success: true,
      message: "Offer updated successfully",
      offer
    });

  } catch (error) {
    console.error("Update Offer Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete offer
// @route   DELETE /api/admin/offers/:id
exports.deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findById(id);

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (offer.status) {
      return res.status(400).json({ message: "Cannot delete an active offer. Deactivate it first." });
    }

    await Offer.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Offer deleted successfully"
    });
  } catch (error) {
    console.error("Delete Offer Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Toggle offer status
// @route   PATCH /api/admin/offers/:id/status
exports.toggleOfferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findById(id);

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (!offer.status) {
      // If we are activating, check for overlap again
      const overlapping = await Offer.findOne({
        _id: { $ne: id },
        type: offer.type,
        referenceId: offer.referenceId,
        status: true,
        $or: [
          { startDate: { $lte: offer.endDate }, endDate: { $gte: offer.startDate } }
        ]
      });

      if (overlapping) {
        return res.status(400).json({ message: "Cannot activate. Overlaps with an existing active offer." });
      }
    }

    offer.status = !offer.status;
    await offer.save();

    res.json({
      success: true,
      message: `Offer ${offer.status ? "activated" : "deactivated"} successfully`,
      status: offer.status
    });
  } catch (error) {
    console.error("Toggle Offer Status Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
