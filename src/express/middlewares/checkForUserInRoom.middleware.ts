import type { Request, Response, NextFunction } from "express";
import roomService from "../services/room.service.js";
class CheckForUserInRoomMiddleware{
    checkUser = async (req: Request, res: Response, next: NextFunction)=>{
        const roomId = req.params["roomId"] as string;
        if(!roomId || !req.userSession)
        {
            res.redirect("/main");
            return;
        }
        const users = await roomService.getAllUsersFromRoom(roomId);
        const includes = users.some(el=> Number(el) === req.userSession?.userId);
        if(!includes)
        {
            res.redirect("/main");
            return;
        }
        next();

    }
}
export default new CheckForUserInRoomMiddleware();