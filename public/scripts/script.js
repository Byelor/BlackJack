const button = document.getElementById("send-ws");
const answer = document.getElementById("answer");
const userInput = document.getElementById("user-input");
const userNickname = document.getElementById("user-nickname");

const socket = new WebSocket(`ws://${window.location.host}`);
const form = document.getElementById("text-form");


form.addEventListener("submit", (event)=>{
    event.preventDefault();
})
button.addEventListener("click", async (event)=>{
    event.preventDefault();
    const value = `${userNickname.value}: ${userInput.value}`;
    socket.send(value);

})

    socket.onmessage = (event)=>{
        answer.innerText += `\n${event.data}`;
    };