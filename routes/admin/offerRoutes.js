const express = require("express");
const router = express.Router();
const offerController = require("../../controllers/admin/offerController");
const authMiddleware = require("../../middlewares/authMiddleware");
const adminMiddleware = require("../../middlewares/adminMiddleware");

// Apply protection to all offer routes
router.use(authMiddleware, adminMiddleware);

router.post("/", offerController.createOffer);
router.get("/", offerController.getOffers);
router.put("/:id", offerController.updateOffer);
router.delete("/:id", offerController.deleteOffer);
router.patch("/:id/status", offerController.toggleOfferStatus);

module.exports = router;
