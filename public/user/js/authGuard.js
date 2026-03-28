// ==========================
// USER AUTH GUARD (BRIDGE)
// ==========================
// This script relies on /js/auth.js being included BEFORE it.

document.addEventListener("DOMContentLoaded", () => {
    if (typeof Auth !== 'undefined') {
        Auth.checkAccess("user");
    } else {
        console.error("Auth utility not found. Please include /js/auth.js");
    }
});
