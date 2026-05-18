import app from "./express.js";
import http from "node:http";


import {Server, Socket} from "socket.io";

import cookie from "cookie";

const server = http.createServer(app);


const socketio = new Server(server, {cors:{
    origin: ["http://127.0.0.1:8888","*"],
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


export {server, socketio};