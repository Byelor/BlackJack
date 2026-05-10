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
        console.log(response);
        return response.json()}
    ).then(data=>{
        console.log(data);
        loginStatus.textContent = data["message"];
        console.log(response);
    }).catch(error=>{console.log(error)});

})