const Sale = require("../models/Sale");

/**
 * @desc    Get the currently active sale for the banner
 * @route   GET /api/sales/active
 * @access  Public
 */
exports.getActiveSale = async (req, res) => {
  try {
    const now = new Date();
    const activeSale = await Sale.findOne({
      status: "active",
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    if (!activeSale) {
      return res.status(404).json({ success: false, message: "No active sale found" });
    }

    res.status(200).json({
      success: true,
      sale: {
        name: activeSale.name,
        bannerImage: activeSale.bannerImage,
        discountValue: activeSale.value,
        discountUnit: activeSale.discountUnit,
        endDate: activeSale.endDate,
      },
    });
  } catch (error) {
    console.error("GET ACTIVE SALE ERROR:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
