async function checkUserAuth() {
    try {
        const res = await fetch("/api/auth/me", {
            credentials: "include"
        });

        if (!res.ok) {
            window.location.href = "/user/login.html";
            return;
        }

        const user = await res.json();

        if (user.role !== "user") {
            window.location.href = "/user/login.html";
        }

    } catch (err) {
        console.error("Auth check error:", err);
        window.location.href = "/user/login.html";
    }
}

document.addEventListener("DOMContentLoaded", checkUserAuth);
