const Wallet = require("../models/wallet");

exports.getWallet = async (req, res) => {
    try {
        let wallet = await Wallet.findOne({ user: req.user._id });
        if (!wallet) {
            wallet = await Wallet.create({ user: req.user._id, balance: 0, transactions: [] });
        }
        res.status(200).json({ balance: wallet.balance });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

exports.getWalletTransactions = async (req, res) => {
    try {
        let wallet = await Wallet.findOne({ user: req.user._id }).populate("transactions.order");
        if (!wallet) {
            wallet = await Wallet.create({ user: req.user._id, balance: 0, transactions: [] });
        }

        // Sort transactions newest first
        const sortedTransactions = wallet.transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({ transactions: sortedTransactions });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

exports.topupWallet = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || typeof amount !== "number" || amount < 100 || amount > 50000) {
            return res.status(400).json({
                message: "Invalid wallet amount"
            });
        }

        let wallet = await Wallet.findOne({ user: req.user._id });

        if (!wallet) {
            wallet = await Wallet.create({ user: req.user._id, balance: 0, transactions: [] });
        }

        wallet.balance += Number(amount);

        wallet.transactions.push({
            type: "Credit",
            amount: Number(amount),
            description: "Wallet top-up"
        });

        await wallet.save();

        res.status(200).json({
            success: true,
            message: "Funds added successfully",
            balance: wallet.balance
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
