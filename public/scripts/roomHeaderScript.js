const header = document.querySelector("header");

header.addEventListener("click", async (event)=>{
    const targetEl = event.target.closest('button, a');
    if(!targetEl)
    {
        return;
    }
    const choice = confirm("really?");
    if(!choice)
    {
        event.preventDefault();
        return;
    }
});