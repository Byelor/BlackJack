import app from "./express.js";
import http from "node:http";

import {WebSocketServer, WebSocket as WS} from "ws";

import {Server, Socket} from "socket.io";

import cookie from "cookie";

const server = http.createServer(app);


const socketio = new Server(server, {cors:{
    origin: "*",
    methods: ["GET", "POST"]
}});

socketio.on("connection", async (socket: Socket)=>{
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    const sessionToken = cookies["sessionToken"];
    if(!sessionToken)
    {
        return;
    }
});

// wss.on("connection",(ws, req)=>{
//     console.log("new ws connection");
//     ws.on("message", (message)=>{
//         const {event, obj} = JSON.parse(message.toString());
//         wsRouter.emit(event, obj, ws);
        
//     });
// });

export {server, socketio};