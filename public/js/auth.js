// ==========================
// UNIFIED AUTH UTILITY (COOKIES)
// ==========================

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

/**
 * CONTEXT-BASED AUTH DETECTION
 * User pages only care about user_token
 * Admin pages only care about admin_token
 */
function getAuth() {
    const isAdminPage = window.location.pathname.startsWith("/admin/");
    
    if (isAdminPage) {
        const adminToken = getCookie("admin_token");
        return { token: adminToken, role: "admin" };
    } else {
        const userToken = getCookie("user_token");
        return { token: userToken, role: "user" };
    }
}

const Auth = {
    /**
     * AUTHENTICATED FETCH WRAPPER
     * Automatically sends context-appropriate token
     */
    async fetch(url, options = {}) {
        const { token } = getAuth();
        const headers = {
            ...options.headers,
            "Content-Type": "application/json",
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

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

            // 1. STORE TOKENS IN ROLE-SPECIFIC COOKIES
            // NOTE: Do NOT clear the other role's token to keep sessions independent
            if (data.role === "user") {
                document.cookie = `user_token=${data.token}; path=/; max-age=18000; SameSite=Lax`;
                document.cookie = `user_id=${data.user._id}; path=/; max-age=18000; SameSite=Lax`;
            } else if (data.role === "admin") {
                document.cookie = `admin_token=${data.token}; path=/; max-age=18000; SameSite=Lax`;
                document.cookie = `admin_id=${data.user._id}; path=/; max-age=18000; SameSite=Lax`;
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

    // LOGOUT (Context-specific)
    async logout() {
        try {
            const isAdminPage = window.location.pathname.startsWith("/admin/");
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
            
            if (isAdminPage) {
                document.cookie = "admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
                document.cookie = "admin_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
                window.location.href = "/admin/login.html";
            } else {
                document.cookie = "user_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
                document.cookie = "user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
                window.location.href = "/login.html";
            }
        } catch (err) {
            console.error("Logout error:", err);
            window.location.href = "/login.html";
        }
    },

    // ACCESS CONTROL (CONTEXT-BASED)
    checkAccess(requiredRole) {
        const token = (requiredRole === "admin") 
            ? getCookie("admin_token") 
            : getCookie("user_token");

        if (!token) {
            if (requiredRole === "admin") {
                window.location.href = "/admin/login.html";
            } else {
                window.location.href = "/login.html";
            }
            return false;
        }
        return true;
    },

    /**
     * BACKEND-VALIDATED ACCESS CHECK
     */
    async checkBackendAccess(requiredRole) {
        try {
            if (!this.checkAccess(requiredRole)) return false;

            const res = await this.fetch("/api/auth/me");
            if (!res.ok) {
                if (requiredRole === "admin") window.location.href = "/admin/login.html";
                else window.location.href = "/login.html";
                return false;
            }

            const user = await res.json();
            if (user.role !== requiredRole) {
                if (requiredRole === "admin") window.location.href = "/admin/login.html";
                else window.location.href = "/login.html";
                return false;
            }

            return true;
        } catch (err) {
            console.error("Auth Check Error:", err);
            window.location.href = "/login.html";
            return false;
        }
    },

    // NAVIGATION HELPERS
    goToAccount() {
        const userToken = getCookie("user_token");
        if (!userToken) {
            window.location.href = "/login.html";
        } else {
            window.location.href = "/user/account.html";
        }
    },

    goToCart() {
        if (!getCookie("user_token")) {
            window.location.href = "/login.html";
        } else {
            window.location.href = "/user/cart.html";
        }
    },

    goToWishlist() {
        if (!getCookie("user_token")) {
            window.location.href = "/login.html";
        } else {
            window.location.href = "/user/wishlist.html";
        }
    },

    isLoggedIn() {
        const isAdminPage = window.location.pathname.startsWith("/admin/");
        const token = isAdminPage ? getCookie("admin_token") : getCookie("user_token");
        return !!token;
    }
};
