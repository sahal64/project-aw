const Product = require("../models/Product");

// Check stock for a specific product
exports.checkStock = async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await Product.findById(productId);

        if (!product || product.isActive === false) {
            return res.status(404).json({ success: false, message: "Product not found or unavailable" });
        }

        res.json({
            success: true,
            stock: product.stock,
            name: product.name
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Batch check stock for multiple products (useful for cart page load)
exports.batchCheckStock = async (req, res) => {
    try {
        const { items } = req.body; // Array of { id, quantity }
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ success: false, message: "Invalid items format" });
        }

        const results = [];
        for (const item of items) {
            const product = await Product.findById(item.id);
            if (product && product.isActive !== false) {
                results.push({
                    id: item.id,
                    name: product.name,
                    image: product.images && product.images.length > 0 ? product.images[0] : '/uploads/placeholder.png',
                    availableStock: product.stock,
                    requestedQuantity: item.quantity,
                    isSufficient: product.stock >= item.quantity
                });
            } else {
                results.push({
                    id: item.id,
                    name: "Unknown Product",
                    image: '/uploads/placeholder.png',
                    availableStock: 0,
                    requestedQuantity: item.quantity,
                    isSufficient: false,
                    error: "Product unavailable"
                });
            }
        }

        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
