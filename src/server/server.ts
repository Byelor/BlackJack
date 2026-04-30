import app from "./express.js";
import http from "node:http";

import {WebSocketServer} from "ws";

const server = http.createServer(app);

const wss = new WebSocketServer({server});



wss.on("connection",()=>{
    console.log("new connection");
});

export {server, wss};