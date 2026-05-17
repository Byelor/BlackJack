import { Router } from "express";
import RoomsApiController from "../controllers/room.api.controller.js";
class RoomsApiRouter{
    router: Router = Router();
    constructor()
    {
        this.initialRoutes();
    }
    initialRoutes(){
        this.router.put("/room/leave", RoomsApiController.leaveRoom);
        this.router.get("/rooms", RoomsApiController.getAllRooms);
        this.router.put("/room/:roomId", RoomsApiController.enterRoom);
    }
}
export default new RoomsApiRouter().router;