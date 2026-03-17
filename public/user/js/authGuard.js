async function checkUserAccess() {
    try {

        const res = await fetch("/api/auth/me", {
            credentials: "include"
        });

        // 1. Check Authentication (Unauthorized)
        if (res.status === 401) {
            window.location.href = "/user/login.html";
            return;
        }

        // 2. Check Block Status (Forbidden)
        if (res.status === 403) {
            const data = await res.json();
            if (data.message === "Your account has been blocked") {
                Swal.fire({
                    icon: "error",
                    title: "Account Blocked",
                    text: "Your account has been blocked by admin.",
                    confirmButtonColor: "#d33"
                }).then(async () => {
                    await fetch("/api/auth/logout", {
                        method: "POST",
                        credentials: "include"
                    });
                    window.location.href = "/user/login.html";
                });
                return;
            }
        }

        if (!res.ok) {
            window.location.href = "/user/login.html";
            return;
        }

        const user = await res.json();

        // 3. Check Role (Admin trying to access User pages)
        if (user.role === "admin") {
            window.location.href = "/admin/dashboard.html";
            return;
        }

        // Handle regular user access (continue)

    } catch (error) {
        console.error("Security check failed:", error);
        window.location.href = "/user/login.html";
    }
}

// Initial check on page load
checkUserAccess();

// Periodically re-check session status (every 30 seconds)
setInterval(checkUserAccess, 30000);
