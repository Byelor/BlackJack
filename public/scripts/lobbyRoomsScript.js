const updateBtn = document.getElementById("update");
const roomsList = document.getElementById("rooms-list");
function makeRoom(roomObj)
{
    const roomEl = document.createElement("li");
    roomEl.innerHTML = 
    `
        <div class="room-meta">
            ${roomObj.name}
            ${roomObj.description}
            ${roomObj.roomId}
            ${roomObj.currentPlayersCount}
            ${roomObj.maxPlayersCount}
            ${roomObj.isPrivate}
            ${roomObj.password}
        </div>
    `;
    roomEl.addEventListener("click", async ()=>{
        let password;
        if(roomObj.isPrivate){
            password = prompt("enter password");
        }
        if(password.length === 0)
        {
            return;
        }
        const response = await fetch(`/api/lobby/room/${roomObj.roomId}`, {
            method: "PUT",
            headers:{
                "content-type": "application/json",
            },
            body: JSON.stringify({password: password || null})
        });
        if(!response.ok)
        {
            alert("buhshit mah");
            return;
        }
        const data = await response.json();
        if(data)
        {
            console.log(data["message"]);
            if(data["message"] !== "all good")
            {
                alert("buhshit mah");
                return;
            }
        }
        window.location.href = `/lobby/room/${roomObj.roomId}`;

    });
    return roomEl;
}
async function showRooms()
{
    const response = await fetch("/api/lobby/rooms", {
            method: "GET",
                headers:{
                "content-type": "application/json",
            }
        });
        if (!response.ok)
        {
            console.log("server error!");
            return;
        }
        const data = await response.json();
        const allRooms = Array.from(data).map(rawMeta => {
            console.log(rawMeta);
            return makeRoom(rawMeta);});
        roomsList.replaceChildren(...allRooms);
}
updateBtn.addEventListener("click", showRooms);
showRooms();
