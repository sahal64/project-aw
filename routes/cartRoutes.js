const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");

// Public/User routes for stock checking
router.get("/check-stock/:productId", cartController.checkStock);
router.post("/batch-check-stock", cartController.batchCheckStock);

module.exports = router;
