const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");
loginForm.addEventListener("submit", (event)=>{
    event.preventDefault();
    const nicknameInput = document.getElementById("nickname-input");
    const passwordInput = document.getElementById("password-input");
    const loginData = {
        identifier: nicknameInput.value,
        password: passwordInput.value,
    }

    fetch("/api/authorization/login", {
        method: "POST",
        headers:{
            "content-type": "application/json",
        },
        body: JSON.stringify(loginData)
    }).then(response=>{

        return response.json()}
    ).then(data=>{
        console.log(data);
        if(data["message"] === "all good"){
            window.location.href=`/setcookie?sessionToken=${data["sessionToken"]}`;
            return;
        }
        loginStatus.textContent = data["message"];
    }).catch(error=>{console.log(error)});

})