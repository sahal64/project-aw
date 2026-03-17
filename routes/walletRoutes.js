const express = require("express");
const router = express.Router();
const { getWallet, getWalletTransactions, topupWallet } = require("../controllers/walletController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, getWallet);
router.get("/transactions", authMiddleware, getWalletTransactions);
router.post("/topup", authMiddleware, topupWallet);

module.exports = router;
