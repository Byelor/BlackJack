import app from "./express.js";
import http from "node:http";

import {WebSocketServer, WebSocket as WS} from "ws";

const server = http.createServer(app);

const wss = new WebSocketServer({server});


wss.on("connection",(ws, req)=>{
    console.log("new connection");
    
});

export {server, wss};