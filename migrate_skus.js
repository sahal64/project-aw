const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');

async function migrateSKUs() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected Successfully.");

        // 1. Find products without SKU
        const products = await Product.find({ 
            $or: [
                { sku: { $exists: false } },
                { sku: "" },
                { sku: null }
            ]
        });

        console.log(`Found ${products.length} products missing SKUs.`);

        if (products.length === 0) {
            console.log("No migration needed.");
            process.exit(0);
        }

        let updatedCount = 0;

        for (let product of products) {
            const brandName = product.brand || "AEROWATCH";
            let sku;
            let isUnique = false;
            let attempts = 0;

            // 2. Generate and check uniqueness
            while (!isUnique && attempts < 10) {
                const randomNum = Math.floor(1000 + Math.random() * 90000); // 4-5 digits
                const sanitizedBrand = brandName.toUpperCase().replace(/\s/g, '');
                sku = `AW-${sanitizedBrand}-${randomNum}`;

                const existingProduct = await Product.findOne({ sku });
                if (!existingProduct) {
                    isUnique = true;
                }
                attempts++;
            }

            if (isUnique) {
                product.sku = sku;
                await product.save();
                updatedCount++;
                console.log(`- Updated: ${product.name} -> ${sku}`);
            } else {
                console.error(`- Failed to generate unique SKU for: ${product.name}`);
            }
        }

        console.log(`\nMigration completed. ${updatedCount} products updated.`);
        
        // Final Validation
        const remaining = await Product.countDocuments({ 
            $or: [
                { sku: { $exists: false } },
                { sku: "" },
                { sku: null }
            ]
        });
        
        if (remaining === 0) {
            console.log("SUCCESS: All products now have SKUs.");
        } else {
            console.warn(`WARNING: ${remaining} products still missing SKUs.`);
        }

        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrateSKUs();
