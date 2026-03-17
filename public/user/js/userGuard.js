async function checkUserRole(){

    const res = await fetch("/api/auth/me",{credentials:"include"});

    if(!res.ok){
        window.location.href="/user/login.html";
        return;
    }

    const user = await res.json();

    if(user.role === "admin"){
        window.location.href="/admin/dashboard.html";
    }

}

checkUserRole();
