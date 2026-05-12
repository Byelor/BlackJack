
const registerForm = document.getElementById("register-form");

const formStatus = document.getElementById("form-status");

registerForm.addEventListener("submit", async (event)=>{
    event.preventDefault();
    const nickname = document.getElementById("nickname-input");
    const email = document.getElementById("email-input");
    const password = document.getElementById("password-input");
    const passwordRepeat = document.getElementById("password-repeat-input");
    

    if(password.value != passwordRepeat.value)
    {
        formStatus.textContent = "Пароли не совпадают!";
    }
        const sendValues = {name: nickname.value, email: email.value, password: password.value};
    try{
        const response = await fetch("/api/authorization/register", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify(sendValues)
    });

    const responseJson = await response.json();
    if(responseJson["message"] === "all good")
    {
        window.location.href = `/setCookie?sessionToken=${responseJson["sessionToken"]}`;
    }
    formStatus.textContent = responseJson["message"];
    }
    catch(error)
    {
        console.log("error occurred: ", error);
    }

    
})