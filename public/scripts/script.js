const socket = new WebSocket(`ws://${window.location.host}`);

const form = document.getElementById("form");

form.addEventListener("submit", (event)=>{
    event.preventDefault();
    window.location.href="/";
})