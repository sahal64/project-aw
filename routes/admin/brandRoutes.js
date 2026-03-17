const express = require("express");
const router = express.Router();
const brandController = require("../../controllers/admin/brandController");
const authMiddleware = require("../../middlewares/authMiddleware");
const adminMiddleware = require("../../middlewares/adminMiddleware");
const upload = require("../../middlewares/uploadMiddleware");

// Apply protection to all brand routes
router.use(authMiddleware, adminMiddleware);

router.get("/", brandController.getAllBrands);
router.post("/", upload.single("logo"), brandController.createBrand);
router.put("/:id", upload.single("logo"), brandController.updateBrand);
router.delete("/:id", brandController.deleteBrand);
router.patch("/:id/status", brandController.toggleBrandStatus);

module.exports = router;
