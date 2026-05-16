import { Router } from "express";
import RoomViewController from "../controllers/room.view.controller.js";
class RoomViewRouter{
    router: Router = Router();
    constructor()
    {
        this.initialRoutes();
    }
    initialRoutes(){
        this.router.get("", )
    }
}