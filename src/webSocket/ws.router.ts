import { EventEmitter } from "node:stream";
import WSController from "./ws.controller.js";
class WSAPIRouter{
    eventEmitter: EventEmitter = new EventEmitter();
    constructor()
    {
        this.initialRoutes();
    }   
    initialRoutes(){
        this.eventEmitter.on("BET", )
    } 
}

export default new WSAPIRouter().initialRoutes;