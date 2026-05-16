import RedisClient from "../../database/redis.js";
import type {RoomMeta} from "../models/room.meta.dto.js";
import type { Room } from "../models/Room.dto.js";
import { room_status } from "../models/Room.dto.js";

const PREFIXES = {
    roomsActive: "rooms:active",
    roomMeta: (roomId: string)=>{return `room:meta:${roomId}`},
    roomUser: (roomId: string, userId: number)=>{ return `room:player:${roomId}:user:${userId}`;  },
    roomUsers: (roomId: string) => {return `room:users:${roomId}`},
    roomGame: (roomId: string) => {return `room:game:${roomId}`},
    userIdRoom: (userId: number)=> {return `user:id:room:${userId}`}
}
class RoomRedisRepository{
    getPlayersCount = async (roomId: string)=>{
        return RedisClient.sCard(PREFIXES.roomUsers(roomId));
    }

    getRoomMetas = async() =>{
        const multi = RedisClient.multi();
        const rooms = await this.getActiveRoomIds();
        if(!rooms)
        {
            return null;
        }
        const roomCount = rooms.length;
        rooms.forEach((id)=>{
            multi.hGetAll(PREFIXES.roomMeta(id));
        });
        rooms.forEach((id)=>{
            multi.sCard(PREFIXES.roomUsers(id));
        });
        const raw = await multi.exec();

        const rawMetas = raw.splice(0, roomCount) as unknown as Record<string, string>[];
        const userCounts = raw;
        const metas: RoomMeta[] = [];
        rooms.forEach((id, ind)=>{
            const rawMeta = rawMetas[ind];
            if (!rawMeta || Object.keys(rawMeta).length === 0) return;
            const meta: RoomMeta = {
                roomId: id,
                name: rawMeta["name"] || "",
                description: rawMeta["description"] || "",
                maxPlayersCount: Number(rawMeta["max_players_count"]),
                isPrivate: (rawMeta["is_private"] === "true"),
                password: rawMeta["password"] || "",
                currentPlayersCount: Number(userCounts[ind]),

            }
            metas.push(meta);
        });
        
        return metas;
    }
    getActiveRoomIds = async ()=>{
        const rooms = await RedisClient.sMembers(PREFIXES.roomsActive);
        if(!rooms)
        {
            return null;
        }
        return rooms;
    }
    generateDefaultRoom = async(roomId: string, userId: number)=>{
        const defaultRoom: Room = {
            roomId: roomId,
            dealer: [],
            status: room_status.BETTING,
            currentPlayer: userId,
            deck: ["1","2","3","4"]
        }
        return defaultRoom;
    }
    createRoom = async(roomId: string, userId: number, roomMeta: RoomMeta)=>{
        const multi = RedisClient.multi();
        multi.hSet(PREFIXES.roomMeta(roomId), 
        {   
            "name": roomMeta["name"],
            "description": roomMeta["description"],
            "max_players_count": roomMeta["maxPlayersCount"],
            "is_private": roomMeta["isPrivate"] ? "true" : "false",
            "password": roomMeta["password"],
        });
        
        multi.sAdd(PREFIXES.roomUsers(roomId), String(userId));
        const room: Room = await this.generateDefaultRoom(roomId, userId);
        multi.hSet(PREFIXES.roomGame(roomId), {
            "room_id": room.roomId,
            "dealer": JSON.stringify(room.dealer),
            "deck": JSON.stringify(room.deck),
            "current_player": room.currentPlayer,
            "status": room.status
        });
        multi.set(PREFIXES.userIdRoom(userId), roomId);
        multi.hSet(PREFIXES.roomUser(roomId, userId), {
            "current_hand_index": 0,
            "hands": "[]",
        });
        multi.sAdd(PREFIXES.roomsActive, roomId);
        await multi.exec();
        return roomId;
    }
    deleteRoom = async (roomId: string)=>{
        const multi = RedisClient.multi();
        const usersInRoom = await RedisClient.sMembers(PREFIXES.roomUsers(roomId));
        usersInRoom.forEach(userId => multi.del([PREFIXES.roomUser(roomId, Number(userId)), PREFIXES.userIdRoom(Number(userId))]));
        multi.del([PREFIXES.roomMeta(roomId), PREFIXES.roomGame(roomId), PREFIXES.roomUsers(roomId)]);
        multi.sRem(PREFIXES.roomsActive, roomId);
        await multi.exec();
        return roomId;
    }
}

/*
хранение соответствия юзер - айди комнаты

*/
export default new RoomRedisRepository();