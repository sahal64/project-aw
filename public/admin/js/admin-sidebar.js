// Load admin name into sidebar
document.addEventListener("DOMContentLoaded", () => {
    if (typeof Auth !== "undefined" && Auth.fetch) {
        Auth.fetch("/api/auth/me").then(r => r.json()).then(u => {
            if (u.name) {
                const nameEl = document.getElementById("adminName");
                const avatarEl = document.getElementById("adminAvatar");
                if (nameEl) nameEl.textContent = u.name;
                if (avatarEl) avatarEl.textContent = u.name.charAt(0).toUpperCase();
            }
        }).catch(() => {});
    }
});
