import app from "./express.js";
import http from "node:http";

import {WebSocketServer, WebSocket as WS} from "ws";

const server = http.createServer(app);

const wss = new WebSocketServer({server});

import myEmitter from "./router.js";


wss.on("connection",(ws, req)=>{
    console.log("new ws connection");
    ws.on("message", (message)=>{
        const {event, obj} = JSON.parse(message.toString());
        myEmitter.emit(event, obj, ws);

    });
});

export {server, wss};