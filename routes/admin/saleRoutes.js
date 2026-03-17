const express = require("express");
const router = express.Router();
const saleController = require("../../controllers/admin/saleController");
const authMiddleware = require("../../middlewares/authMiddleware");
const adminMiddleware = require("../../middlewares/adminMiddleware");
const upload = require("../../middlewares/uploadMiddleware");

// All routes protected by Auth and Admin Middleware
router.use(authMiddleware, adminMiddleware);

// POST /api/admin/sales - Create a sale
router.post("/", upload.single("bannerImage"), saleController.createSale);

// GET /api/admin/sales - Get all sales
router.get("/", saleController.getSales);

// PUT /api/admin/sales/:id - Update a sale
router.put("/:id", upload.single("bannerImage"), saleController.updateSale);

// DELETE /api/admin/sales/:id - Delete a sale
router.delete("/:id", saleController.deleteSale);

// PATCH /api/admin/sales/:id/status - Toggle sale status
router.patch("/:id/status", saleController.toggleSaleStatus);

module.exports = router;
