const loginForm = document.getElementById("login-form");

loginForm.addEventListener("submit", (event)=>{
    event.preventDefault();
    const nicknameInput = document.getElementById("nickname-input");
    const passwordInput = document.getElementById("password-input");
    const loginData = {
        username: nicknameInput.value,
        passwordInput: passwordInput.value,
    }

    const fetchResult = fetch("/api/login", {
        method: "POST",
        headers:{
            "content-type": "application/json",
        },
        body: JSON.stringify(loginData)
    }).then(response=>response.json()).then(data=>{
        console.log(data);
    }).catch(error=>{console.log(error)});

})