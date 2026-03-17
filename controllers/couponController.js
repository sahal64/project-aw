const Coupon = require("../models/Coupon");

// Admin - Create a new coupon
exports.createCoupon = async (req, res) => {
    try {
        const {
            code,
            description,
            discountType,
            discountValue,
            minimumSpend,
            maximumDiscount,
            startDate,
            expiryDate,
            maxUses,
            perUserLimit
        } = req.body;

        const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (existingCoupon) {
            return res.status(400).json({ message: "Coupon code already exists" });
        }

        const coupon = new Coupon({
            code,
            description,
            discountType,
            discountValue,
            minimumSpend,
            maximumDiscount,
            startDate,
            expiryDate,
            maxUses,
            perUserLimit
        });

        await coupon.save();
        res.status(201).json({ message: "Coupon created successfully", coupon });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin - Get all coupons
exports.getAllCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin - Delete coupon
exports.deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }
        res.json({ message: "Coupon deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin - Toggle coupon active status
exports.toggleCouponStatus = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }
        coupon.isActive = !coupon.isActive;
        await coupon.save();
        res.json({ message: "Coupon status updated", coupon });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin - Update coupon
exports.updateCoupon = async (req, res) => {
    try {
        const {
            code,
            description,
            discountType,
            discountValue,
            minimumSpend,
            maximumDiscount,
            startDate,
            expiryDate,
            maxUses,
            perUserLimit,
            isActive
        } = req.body;

        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        // Only check for duplicate code if the code is being changed
        if (code && code.toUpperCase() !== coupon.code) {
            const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
            if (existingCoupon) {
                return res.status(400).json({ message: "Coupon code already exists" });
            }
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            req.params.id,
            {
                code,
                description,
                discountType,
                discountValue,
                minimumSpend,
                maximumDiscount,
                startDate,
                expiryDate,
                maxUses,
                perUserLimit,
                isActive
            },
            { new: true, runValidators: true }
        );

        res.json({ message: "Coupon updated successfully", coupon: updatedCoupon });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// User - Get all active coupons
exports.getActiveCoupons = async (req, res) => {
    try {
        const now = new Date();
        const coupons = await Coupon.find({
            isActive: true,
            expiryDate: { $gt: now },
            $or: [
                { maxUses: null },
                { $expr: { $lt: ["$usedCount", "$maxUses"] } }
            ]
        }).sort({ expiryDate: 1 });

        res.json({
            success: true,
            coupons: coupons.map(c => ({
                id: c._id,
                code: c.code,
                description: c.description,
                discountType: c.discountType,
                discountValue: c.discountValue,
                minimumSpend: c.minimumSpend,
                expiryDate: c.expiryDate
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// User - Validate coupon during checkout
exports.validateCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ message: "Coupon code is required" });
        }

        const coupon = await Coupon.findOne({ code: code.toUpperCase() });

        if (!coupon) {
            return res.status(404).json({ message: "Invalid coupon code" });
        }

        if (!coupon.isActive) {
            return res.status(400).json({ message: "This coupon is currently inactive" });
        }

        if (new Date(coupon.expiryDate) < new Date()) {
            return res.status(400).json({ message: "This coupon has expired" });
        }

        res.json({ message: "Coupon is valid", coupon });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// User - Apply coupon and calculate discount
exports.applyCoupon = async (req, res) => {
    try {
        const { couponCode, cartTotal } = req.body;
        const code = couponCode || req.body.code; // Support both

        if (!code || cartTotal === undefined) {
            return res.status(400).json({ success: false, message: "Coupon code and cart total are required" });
        }

        const coupon = await Coupon.findOne({ code: code.toUpperCase() });

        if (!coupon) {
            return res.json({ success: false, message: "Coupon does not exist" });
        }

        if (!coupon.isActive) {
            return res.json({ success: false, message: "Coupon is inactive" });
        }

        // Check Date Range
        const now = new Date();
        if (coupon.startDate && now < new Date(coupon.startDate)) {
            return res.json({ success: false, message: "Coupon is not yet active" });
        }
        if (now > new Date(coupon.expiryDate)) {
            return res.json({ success: false, message: "Coupon has expired" });
        }

        // Minimum Spend Validation
        if (cartTotal < coupon.minimumSpend) {
            return res.json({
                success: false,
                message: `Minimum spend of ₹${coupon.minimumSpend} required`
            });
        }

        // Global Usage Limit
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
            return res.json({ success: false, message: "Coupon usage limit reached" });
        }

        // Per-User Limit
        const userUsageCount = coupon.usedBy.filter(id => id.toString() === req.user._id.toString()).length;
        if (coupon.perUserLimit !== null && userUsageCount >= coupon.perUserLimit) {
            return res.json({ success: false, message: "You have already used this coupon" });
        }

        // Discount Calculation
        let discount = 0;
        if (coupon.discountType === "percentage") {
            discount = (cartTotal * coupon.discountValue) / 100;
            if (coupon.maximumDiscount !== null && coupon.maximumDiscount > 0) {
                discount = Math.min(discount, coupon.maximumDiscount);
            }
        } else if (coupon.discountType === "fixed") {
            discount = coupon.discountValue;
        }

        discount = Math.floor(Math.min(discount, cartTotal));
        const finalTotal = cartTotal - discount;

        // Note: We do NOT increment usage here. 
        // Usage should be incremented in placeOrder when the order is formally created.
        // However, the current placeOrder doesn't do it. 
        // to stay safe with "Do NOT change order creation flow", I'll consider if I should add it there.
        // But for "Apply Coupon" endpoint, returning the values is enough.

        res.json({
            success: true,
            discountAmount: discount,
            finalTotal,
            couponCode: coupon.code
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
