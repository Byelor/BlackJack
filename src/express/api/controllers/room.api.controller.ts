import type { Request, Response, NextFunction } from "express";



import roomService from "../../services/room.service.js";
import engine from "../../../game/BlackjackEngine.js";
import roomRepo from "../../repositories/room.redis.repository.js";

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

    private notifyRoomUserLeft = async (roomId: string, userId: number) => {
        try {
            const { socketio } = await import("../../../server/server.js");
            socketio.to(roomId).emit("PLAYER_LEFT", { userId });

            const sockets = await socketio.fetchSockets();
            for (const socket of sockets) {
                if ((socket.data as any)?.userSession?.userId === userId) {
                    socket.leave(roomId);
                    (socket.data as any).currentRoomId = null;
                }
            }

            const game = await roomRepo.getRoomGame(roomId);
            if (!game) return;

            const state = await engine.buildRoomState(roomId);
            socketio.to(roomId).emit("ROOM_STATE", state);
        } catch (err) {
            console.error("[room leave notify error]", err);
        }
    };

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

        await this.notifyRoomUserLeft(roomId, userId);
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