const fs = require('fs');
const path = require('path');

const userDir = 'd:/project AEROWATCH/public/user';
const files = fs.readdirSync(userDir).filter(f => f.endsWith('.html'));

const privatePages = [
    'account.html', 'address-book.html', 'cart.html', 'checkout.html',
    'invoice.html', 'my-cancellations.html', 'my-orders.html', 'my-returns.html',
    'my-wallet.html', 'order-details.html', 'profile-details.html',
    'return-order.html', 'track-order.html', 'wishlist.html', 'write-review.html'
];

files.forEach(file => {
    const filePath = path.join(userDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove legacy guards
    content = content.replace(/<script src="\/user\/js\/authGuard.js"><\/script>/g, '');
    content = content.replace(/<script src="\/user\/js\/userAuth.js"><\/script>/g, '');
    content = content.replace(/<script src="\/user\/js\/userGuard.js"><\/script>/g, '');
    content = content.replace(/<script src="js\/authGuard.js"><\/script>/g, '');
    content = content.replace(/<script src="js\/userAuth.js"><\/script>/g, '');
    
    // Ensure auth.js is included before </body>
    if (!content.includes('/js/auth.js')) {
        content = content.replace('</body>', '    <script src="/js/auth.js"></script>\n</body>');
    }

    // Add checkAccess for private pages
    if (privatePages.includes(file)) {
        if (!content.includes('Auth.checkAccess("user")')) {
            content = content.replace('</body>', '    <script>\n        Auth.checkAccess("user");\n    </script>\n</body>');
        }
    }

    // Update navbar links (heuristic)
    content = content.replace(/href="home.html"/g, 'href="/user/home.html"');
    content = content.replace(/href="product.html"/g, 'href="/user/product.html"');
    content = content.replace(/href="cart.html"/g, 'href="javascript:Auth.goToCart()"');
    content = content.replace(/href="wishlist.html"/g, 'href="javascript:Auth.goToWishlist()"');
    content = content.replace(/id="accountBtn"/g, 'id="accountBtn" href="javascript:Auth.goToAccount()"');

    fs.writeFileSync(filePath, content);
});

console.log('Processed ' + files.length + ' files.');
