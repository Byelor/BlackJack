import type { Request, Response, NextFunction } from "express";
import roomService from "../../services/room.service.js";
class RoomViewController{
    RenderRoomsPage = async (req: Request, res: Response, next: NextFunction)=>{
        const data = await roomService.getAllRoomsMeta() || [];
        res.render("rooms", {layout: "layout", rooms: data, user: req.userSession});
    }
    RenderRoomPage = async (req: Request, res: Response, next: NextFunction)=>{
        res.render("room", {layout: "roomLayout", user: req.userSession});
    }
}
export default new RoomViewController();