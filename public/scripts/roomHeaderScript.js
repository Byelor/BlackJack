const header = document.querySelector("header");

header.addEventListener("click", async (event)=>{
    try{
    event.preventDefault();

    const targetEl = event.target.closest('button, a');
    if(!targetEl)
    {   
        return;
    }
    const choice = confirm("really?");
    if(!choice)
    {
        return;
    }
    const response = await fetch("/api/lobby/room/leave", {
        method: "PUT",
        headers: {"content-type": "application/json"}
    });
    
    const data = await response.json();
    if(!data)
    {
        event.preventDefault();
        return;
    }
    console.log(data["message"]);
    // if(1) добавить проверку, что при некоторых статус кодах не отпускать пользователя
    // {
    // }
    window.location.href = targetEl.href;
}
catch(error)
{
    console.log(error);
}
});