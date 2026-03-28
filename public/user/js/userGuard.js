async function checkUserRole() {
    // Check access locally first
    Auth.checkAccess("user");

    const res = await Auth.fetch("/api/auth/me");

    if (!res.ok) {
        window.location.href = "/user/login.html";
        return;
    }

    const user = await res.json();
    // No more global redirects to admin from user pages
}

checkUserRole();
