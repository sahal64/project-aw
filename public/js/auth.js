// ==========================
// UNIFIED AUTH UTILITY (COOKIES)
// STRICT: admin_token for admin, user_token for user. No crossover.
// ==========================

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function clearCookie(name) {
    document.cookie = name + "=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
}

/**
 * Detect the page context
 */
function isAdminPage() {
    return window.location.pathname.startsWith("/admin/");
}

/**
 * Get auth state for the CURRENT context only (strict separation)
 */
function getAuth() {
    if (isAdminPage()) {
        return { role: getCookie("admin_role"), hasSession: !!getCookie("admin_role") };
    }
    return { role: getCookie("user_role"), hasSession: !!getCookie("user_role") };
}

const Auth = {
    /**
     * AUTHENTICATED FETCH WRAPPER
     * Sends cookies automatically via credentials: include
     */
    async fetch(url, options = {}) {
        // Don't override Content-Type if body is FormData
        const headers = options.body instanceof FormData
            ? { ...options.headers }
            : { ...options.headers, "Content-Type": "application/json" };

        return fetch(url, {
            ...options,
            headers,
            credentials: "include"
        });
    },

    // LOGIN
    async login(email, password, rememberMe = false) {
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
                credentials: "include"
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Login failed");

            // Store user ID in a non-httpOnly cookie for frontend use
            if (data.role === "admin") {
                clearCookie("admin_id");
                document.cookie = `admin_id=${data.user._id}; path=/; max-age=18000; SameSite=Lax`;
            } else {
                clearCookie("user_id");
                document.cookie = `user_id=${data.user._id}; path=/; max-age=18000; SameSite=Lax`;
            }

            if (rememberMe) {
                localStorage.setItem("rememberEmail", email);
            } else {
                localStorage.removeItem("rememberEmail");
            }

            return data;
        } catch (err) {
            throw err;
        }
    },

    // LOGOUT — clears ALL cookies for the current side
    async logout() {
        try {
            const logoutRole = isAdminPage() ? "admin" : "user";

            // Backend call clears HTTPOnly cookies
            await fetch("/api/auth/logout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: logoutRole }),
                credentials: "include"
            });

            // Clear frontend-visible cookies for this side
            if (isAdminPage()) {
                clearCookie("admin_token");
                clearCookie("admin_id");
                clearCookie("admin_role");
            } else {
                clearCookie("user_token");
                clearCookie("user_id");
                clearCookie("user_role");
            }

            // Legacy cleanup
            clearCookie("role");
            clearCookie("token");
            localStorage.removeItem("isLoggedIn");

            // Redirect to appropriate login
            if (isAdminPage()) {
                window.location.replace("/login.html");
            } else {
                window.location.replace("/login.html");
            }
        } catch (err) {
            console.error("Logout error:", err);
            // Force redirect even on error
            clearCookie("admin_token"); clearCookie("admin_id"); clearCookie("admin_role");
            clearCookie("user_token"); clearCookie("user_id"); clearCookie("user_role");
            clearCookie("role"); clearCookie("token");
            localStorage.removeItem("isLoggedIn");
            window.location.replace("/login.html");
        }
    },

    /**
     * CLIENT-SIDE ACCESS CHECK
     * Strictly checks the role cookie for the current context.
     * Admin pages require admin_role, user pages require user_role. No crossover.
     */
    checkAccess(requiredRole) {
        const auth = getAuth();

        if (!auth.hasSession) {
            this.redirectToLogin(requiredRole);
            return false;
        }

        return true;
    },

    /**
     * BACKEND-VALIDATED ACCESS CHECK
     * Calls /api/auth/me to verify the session is valid.
     */
    async checkBackendAccess(requiredRole) {
        try {
            // 1. Quick client-side cookie check
            if (!this.checkAccess(requiredRole)) {
                return false;
            }

            // 2. Verify session with backend
            const res = await this.fetch("/api/auth/me");
            if (!res.ok) {
                console.warn("Backend auth check failed. Redirecting to login.");
                this.redirectToLogin(requiredRole);
                return false;
            }

            const user = await res.json();

            // 3. Strict role enforcement — admin can't access user pages, user can't access admin
            if (user.role !== requiredRole) {
                console.warn("Role mismatch. Redirecting.");
                this.redirectToLogin(requiredRole);
                return false;
            }

            return true;
        } catch (error) {
            console.error("Auth check error:", error);
            this.redirectToLogin(requiredRole);
            return false;
        }
    },

    // Standardized Redirection Helper
    redirectToLogin(role) {
        window.location.replace("/login.html");
    },

    // NAVIGATION HELPERS — strict: only user_role allows access
    goToAccount() {
        if (!getCookie("user_role")) {
            if (typeof Swal !== "undefined") {
                Swal.fire({ icon: "warning", title: "Login Required", text: "Please login to view your account" })
                    .then(() => window.location.href = "/login.html");
            } else {
                window.location.href = "/login.html";
            }
        } else {
            window.location.href = "/user/account.html";
        }
    },

    goToCart() {
        if (!getCookie("user_role")) {
            if (typeof Swal !== "undefined") {
                Swal.fire({ icon: "warning", title: "Login Required", text: "Please login to view your cart" })
                    .then(() => window.location.href = "/login.html");
            } else {
                window.location.href = "/login.html";
            }
        } else {
            window.location.href = "/user/cart.html";
        }
    },

    goToWishlist() {
        if (!getCookie("user_role")) {
            if (typeof Swal !== "undefined") {
                Swal.fire({ icon: "warning", title: "Login Required", text: "Please login to view your wishlist" })
                    .then(() => window.location.href = "/login.html");
            } else {
                window.location.href = "/login.html";
            }
        } else {
            window.location.href = "/user/wishlist.html";
        }
    },

    // GENERAL ACTION PROTECTOR
    requireLogin(actionName) {
        if (!getCookie("user_role")) {
            if (typeof Swal !== "undefined") {
                Swal.fire({
                    icon: "warning",
                    title: "Login Required",
                    text: `Please login to ${actionName}`
                }).then(() => {
                    window.location.href = "/login.html";
                });
            } else {
                window.location.href = "/login.html";
            }
            return false;
        }
        return true;
    },

    isLoggedIn() {
        return getAuth().hasSession;
    }
};

// ==========================
// BACK-BUTTON PROTECTION
// When the browser restores a page from bfcache (back/forward),
// re-check if the session cookie still exists. If not, redirect.
// ==========================
window.addEventListener("pageshow", function (event) {
    // persisted = true means the page was restored from bfcache
    if (event.persisted) {
        const auth = getAuth();
        if (!auth.hasSession) {
            window.location.replace("/login.html");
        }
    }
});
