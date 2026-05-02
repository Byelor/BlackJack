import {Router} from "express";
import RoomController from "./room.controller.js";
class roomRouter{
    router: Router = Router();

    constructor()
    {
        this.initialRoutes();
    }
    initialRoutes(){
        this.router.get("/:id",RoomController.renderRoom);
    }
}

export default new roomRouter().router;