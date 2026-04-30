import server from "./http.js";
import {WebSocketServer} from "ws";

const wss = new WebSocketServer({server});


wss.on("connection",()=>{});

