import type { Request, Response, NextFunction } from "express";
import userSessionService from "../../services/userSession.service.js";
import userService from "../../services/user.service.js";
class RoomsApiController{
    getAllRooms = async(req: Request, res: Response, next: NextFunction)=>{
        
    }
}
export default new RoomsApiController();