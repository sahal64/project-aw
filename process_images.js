const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');

const imagesToProcess = [
    {
        url: 'https://watchesprime.com/wp-content/uploads/2022/01/ax5608-armani-exchange-watch-women-rose-gold-dial-leather-green-strap-quartz-analog-three-hand-harper.jpg',
        name: 'ax5608-dial.webp'
    },
    {
        url: 'https://watchesprime.com/wp-content/uploads/2022/01/ax5608-armani-exchange-watch-women-rose-gold-dial-leather-green-strap-quartz-analog-three-hand-harper_2.jpg',
        name: 'ax5608-side.webp'
    },
    {
        url: 'https://watchesprime.com/wp-content/uploads/2022/01/ax5608-armani-exchange-watch-women-rose-gold-dial-leather-green-strap-quartz-analog-three-hand-harper_3.jpg',
        name: 'ax5608-back.webp'
    }
];

const productId = '6996b5295713e35f28b8b163';
const uploadDir = path.join(__dirname, 'public', 'uploads');

async function downloadAndCompress(url, destName) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image: ${response.statusCode}`));
                return;
            }

            const tempFile = path.join(uploadDir, `temp-${destName}.jpg`);
            const fileStream = fs.createWriteStream(tempFile);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();

                sharp(tempFile)
                    .webp({ quality: 80 })
                    .toFile(path.join(uploadDir, destName))
                    .then(() => {
                        fs.unlinkSync(tempFile);
                        resolve(`/uploads/${destName}`);
                    })
                    .catch(reject);
            });
        }).on('error', reject);
    });
}

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const newImagePaths = [];
        for (const img of imagesToProcess) {
            console.log(`Processing ${img.name}...`);
            const path = await downloadAndCompress(img.url, img.name);
            newImagePaths.push(path);
            console.log(`Saved and compressed: ${path}`);
        }

        const product = await Product.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        // Keep existing images and add new ones (avoid duplicates)
        newImagePaths.forEach(path => {
            if (!product.images.includes(path)) {
                product.images.push(path);
            }
        });

        await product.save();
        console.log('Product updated successfully with new images!');
        console.log('New image array:', product.images);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

run();
