const socket = new WebSocket(`ws://${window.location.host}`);

socket.send({method: "BET", amount: "200", roomId: "4"});