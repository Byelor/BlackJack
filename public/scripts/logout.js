const logout = document.getElementById("logout");
if (!logout) {
    // На страницах без кнопки logout (например, лобби) скрипт не нужен
} else logout.addEventListener("click", async (event)=>{
    event.preventDefault();
    try{
        const response = await fetch("/api/authorization/logout", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            }
        })
        console.log(response);
        const responseJson = await response.json();
        const message = responseJson["message"];
        if(message === "all good"){
            window.location.href = "/main";
            return;
        }
        console.log("Ошибка при попытке выхода из аккаунта!");
    }
    catch(error){
        console.log("error occurred: ", error);
    }
});