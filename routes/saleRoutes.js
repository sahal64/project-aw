const express = require("express");
const router = express.Router();
const saleController = require("../controllers/saleController");

// Public route to get the active sale for homepage
router.get("/active", saleController.getActiveSale);

module.exports = router;
