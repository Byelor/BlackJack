import { Router } from "express";
import RoomsApiController from "../controllers/room.api.controller.js";
class RoomsApiRouter{
    router: Router = Router();
    constructor()
    {
        this.initialRoutes();
    }
    initialRoutes(){

    }
}
export default new RoomsApiRouter().router;