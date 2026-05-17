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
    generateDefaultRoom = (roomId: string, userId: number)=>{
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
        const room: Room = this.generateDefaultRoom(roomId, userId);
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
    addUserToRoom = async (roomId: string, userId: number)=>{
        RedisClient.watch(PREFIXES.roomMeta(roomId));
        const multi = RedisClient.multi();
        const getRoom = await RedisClient.get(PREFIXES.userIdRoom(userId));
        if(getRoom)
        {
            multi.sRem(PREFIXES.roomUsers(getRoom), String(userId));
        }
        multi.set(PREFIXES.userIdRoom(userId), roomId);
        multi.hSet(PREFIXES.roomUser(roomId, userId), {
            "current_hand_index": 0,
            "hands": "[]"
        });
        multi.sAdd(PREFIXES.roomUsers(roomId), String(userId));
        const result = await multi.exec();
        if(!result)
        {
            return null;
        }
        return roomId;
    }
    removeUserFromRoom = async (roomId: string, userId: number)=>{
        const currentRoom = await RedisClient.get(PREFIXES.userIdRoom(userId));
        const multi = RedisClient.multi();
        multi.sRem(PREFIXES.roomUsers(roomId), String(userId));
        multi.del([PREFIXES.roomUser(roomId, userId)]);
        if(currentRoom == roomId)
        {
            multi.del(PREFIXES.userIdRoom(userId));
        }
        await multi.exec();
        return roomId;
    }
    getRoomUsers = async (roomId: string)=>{
        return await RedisClient.sMembers(PREFIXES.roomUsers(roomId));
    }
    getRoomMeta = async(roomId: string)=>{
        const multi = RedisClient.multi();
        multi.hGetAll(PREFIXES.roomMeta(roomId));
        multi.sCard(PREFIXES.roomUsers(roomId));
        const raw = await multi.exec();
        const obj = raw[0] as unknown as Record<string, string>;
        const playersCount = raw[1];
        const roomMeta: RoomMeta = {
                roomId: roomId,
                name: obj["name"] || "",
                description: obj["description"] || "",
                maxPlayersCount: Number(obj["max_players_count"]),
                isPrivate: (obj["is_private"] === "true"),
                password: obj["password"] || "",
                currentPlayersCount: Number(playersCount),

        }
        return roomMeta;
    }
    getUserCurrentRoomId = async (userId: number)=>{
        const currentRoom = await RedisClient.get(PREFIXES.userIdRoom(userId));
        return currentRoom;
    }
}

/*
хранение соответствия юзер - айди комнаты

*/
export default new RoomRedisRepository();