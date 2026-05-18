import { Router } from "express";
import RoomViewController from "../controllers/room.view.controller.js";
import checkForUserInRoomMiddleware from "../../middlewares/checkForUserInRoom.middleware.js";
class RoomViewRouter{
    router: Router = Router();
    constructor()
    {
        this.initialRoutes();
    }
    initialRoutes(){
        this.router.get("/rooms", RoomViewController.RenderRoomsPage);
        this.router.get("/room/:roomId", checkForUserInRoomMiddleware.checkUser, RoomViewController.RenderRoomPage);
    }
}
export default new RoomViewRouter().router;