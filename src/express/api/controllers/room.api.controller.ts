import type { Request, Response, NextFunction } from "express";
import userSessionService from "../../services/userSession.service.js";
import userService from "../../services/user.service.js";
import roomService from "../../services/room.service.js";
import type { Room } from "../../models/Room.dto.js";
import type { RoomMeta } from "../../models/room.meta.dto.js";
class RoomsApiController{
    getAllRooms = async(req: Request, res: Response, next: NextFunction)=>{
       const data: RoomMeta[] | null = await roomService.getAllRoomsMeta();
       if(!data)
       {
            res.json([]);
       }
       else{
        res.json(data);
       }
    }
    enterRoom = async(req: Request, res: Response, next: NextFunction)=>{
        if(!req.userSession){
            res.json({"message": "not logined"});
            return;
        }
        if(!req.body)
        {
            res.json({"message": "emptyBody"});
            return;
        }
        const roomId: string = req.params["roomId"] as string;
        const {password} = req.body;
        if(!roomId || !password)
        {
           res.json({message: "invalid input"});
           return;
        }
        
        const userId = req.userSession?.userId;
        const result = await roomService.addUserToRoom(roomId, userId, password);
        if(!result)
        {
            res.json({"message": "error when attempt to join!"});
            return;
        }
        
        res.json({message: "all good"});
    }
    leaveRoom = async (req: Request, res: Response, next: NextFunction)=>{
        if(!req.userSession){
            res.json({"message": "not logined"});
            return;
        }
        const userId = req.userSession?.userId;
    }
}
export default new RoomsApiController();