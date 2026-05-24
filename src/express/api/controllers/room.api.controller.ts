import type { Request, Response, NextFunction } from "express";
import userSessionService from "../../services/userSession.service.js";
import userService from "../../services/user.service.js";
import roomService from "../../services/room.service.js";
import type { Room } from "../../models/room.dto.js";
import type { RoomMeta } from "../../models/room.meta.dto.js";
class RoomsApiController{
    createRoom = async (req: Request, res: Response, next: NextFunction) => {
        if (!req.userSession) {
            res.status(401).json({ message: "not logined" });
            return;
        }

        const body = req.body ?? {};
        const result = await roomService.createRoomForUser(req.userSession.userId, {
            name:             body.name,
            description:      body.description,
            maxPlayersCount:  body.maxPlayersCount,
            isPrivate:        body.isPrivate,
            password:         body.password,
            deckCount:        body.deckCount,
        });

        if ("error" in result) {
            res.status(400).json({ message: result.error });
            return;
        }

        res.status(201).json({ message: "all good", roomId: result.roomId });
    };

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
        const password: string | null = req.body?.password ?? null;
        if (!roomId) {
            res.json({ message: "invalid input" });
            return;
        }

        const userId = req.userSession.userId;
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
        const roomId = await roomService.removeUserFromCurrentRoom(userId);
        if(!roomId)
        {
            res.json({message: "you out from any room!"});
            return;
        }
        res.json({message: "all good", roomId: roomId});
    }

    deleteRoom = async (req: Request, res: Response, next: NextFunction)=>{
        if(!req.userSession){
            res.status(401).json({ message: "not logined" });
            return;
        }

        const roomId = req.params["roomId"] as string;
        if (!roomId) {
            res.status(400).json({ message: "invalid input" });
            return;
        }

        const deleted = await roomService.deleteEmptyRoom(roomId);
        if (!deleted) {
            res.status(409).json({ message: "room is not empty or does not exist" });
            return;
        }

        res.json({ message: "all good" });
    }
}
export default new RoomsApiController();